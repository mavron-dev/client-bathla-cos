import { z } from 'zod'
import { prisma, withRetry } from '@/lib/prisma'
import {
  ApiAuthError,
  isAdminish,
  type AuthContext,
} from '@/lib/api-auth'
import { Prisma } from '@bathla-cos/database'
import {
  startOfDayInTz,
  endOfDayInTz,
  addDaysInTz,
  parseDateInTz,
  currentLocalTimeISO,
  formatLocal,
} from '@/lib/time-tz'
import {
  createUserSchema,
  userAdminUpdateSchema,
  userPrefsSchema,
  USER_PREFS_FIELDS,
} from './schemas'

const DEFAULT_TZ = 'Asia/Kolkata'

/**
 * User service layer.
 *
 * Read access:
 *   - apiKey caller → full read access to active users
 *   - admin / developer session → full read access
 *   - any other session → 403, except for `getUser(self)` which is allowed
 *
 * Write access (createUser, updateUser, deactivateUser):
 *   - admin / developer session → full
 *   - apiKey OR session-as-self on updateUser → only the preferences allow-list
 *     (`languagePref | timezone | voiceReplyEnabled`)
 *   - apiKey on createUser / deactivateUser → 403 (agents must not onboard or
 *     deactivate users)
 */

const userPublic = {
  id: true,
  email: true,
  phoneE164: true,
  displayName: true,
  image: true,
  role: true,
  teamId: true,
  languagePref: true,
  timezone: true,
  voiceReplyEnabled: true,
  isActive: true,
} satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{ select: typeof userPublic }>

const e164 = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Phone must be E.164-ish, e.g. +919876543210')

/**
 * Extended `status` filter so the admin Users page can request 'all' (active +
 * inactive) without dropping the default-active behaviour callers like the
 * agent rely on.
 */
const listUsersQuerySchema = z.object({
  phone: e164.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  role: z
    .enum(['developer', 'admin', 'director', 'manager', 'member'])
    .optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

function assertCanReadUserDirectory(ctx: AuthContext): void {
  // Agents are NEVER allowed to enumerate the user directory — they only
  // operate on their own account (resolved from x-caller-phone). Lifting this
  // restriction would let a jailbroken model phish the contact list.
  if (ctx.kind === 'apiKey') {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Agents cannot enumerate users',
    )
  }
  if (
    ctx.kind === 'session' &&
    ctx.role !== 'admin' &&
    ctx.role !== 'developer'
  ) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Reads

export async function listUsers(
  ctx: AuthContext,
  raw: unknown,
): Promise<PublicUser[]> {
  assertCanReadUserDirectory(ctx)
  const q = listUsersQuerySchema.parse(raw)

  const where: Prisma.UserWhereInput = {}
  if (q.status === 'active') where.isActive = true
  else if (q.status === 'inactive') where.isActive = false
  // 'all' → no isActive filter

  if (q.phone) {
    const stripped = q.phone.replace(/^\+/, '')
    where.phoneE164 = { in: [stripped, `+${stripped}`] }
  }
  if (q.role) where.role = q.role
  if (q.search) {
    where.OR = [
      { displayName: { contains: q.search, mode: 'insensitive' } },
      { email: { contains: q.search, mode: 'insensitive' } },
    ]
  }

  return withRetry(() =>
    prisma.user.findMany({
      where,
      select: userPublic,
      take: q.limit,
      orderBy: { displayName: 'asc' },
    }),
  )
}

export async function getUser(
  ctx: AuthContext,
  id: string,
): Promise<PublicUser> {
  if (
    ctx.kind === 'session' &&
    ctx.role !== 'admin' &&
    ctx.role !== 'developer' &&
    ctx.userId !== id
  ) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
  }
  const user = await withRetry(() =>
    prisma.user.findUnique({ where: { id }, select: userPublic }),
  )
  if (!user) throw new ApiAuthError(404, 'NOT_FOUND', 'User not found')
  return user
}

// ────────────────────────────────────────────────────────────────────────────
// Rich profile

const userProfileSelect = {
  ...userPublic,
  optedInAt: true,
  createdAt: true,
  updatedAt: true,
  team: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect

export type UserProfilePayload = {
  user: Prisma.UserGetPayload<{ select: typeof userProfileSelect }>
  kpis: {
    activeTasks: number
    completedTasks: number
    overdueTasks: number
    sessions: number
  }
  recentActivity: {
    id: string
    updateType: string
    source: string
    createdAt: Date
    task: { id: string; title: string }
  }[]
  recentSessions: {
    id: string
    startedAt: Date
    endedAt: Date | null
    channel: string
    messageCount: number
  }[]
}

export async function getUserProfile(
  ctx: AuthContext,
  id: string,
): Promise<UserProfilePayload> {
  // Admin/dev OR apiKey only — activity logs reveal workload + conversation
  // patterns, so this is gated tighter than the basic getUser endpoint.
  if (!isAdminish(ctx)) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
  }

  const now = new Date()
  const [user, taskCounts, overdueCount, sessionCount, recentActivity, recentSessions] =
    await Promise.all([
      withRetry(() =>
        prisma.user.findUnique({
          where: { id },
          select: userProfileSelect,
        }),
      ),
      withRetry(() =>
        prisma.task.groupBy({
          by: ['status'],
          where: { assignedToId: id, isDeleted: false },
          _count: { _all: true },
        }),
      ),
      withRetry(() =>
        prisma.task.count({
          where: {
            assignedToId: id,
            isDeleted: false,
            status: { notIn: ['done', 'cancelled'] },
            deadline: { lt: now },
          },
        }),
      ),
      withRetry(() => prisma.conversationSession.count({ where: { userId: id } })),
      withRetry(() =>
        prisma.taskUpdate.findMany({
          where: { updatedById: id },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true,
            updateType: true,
            source: true,
            createdAt: true,
            task: { select: { id: true, title: true } },
          },
        }),
      ),
      withRetry(() =>
        prisma.conversationSession.findMany({
          where: { userId: id },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            channel: true,
            messageCount: true,
          },
        }),
      ),
    ])

  if (!user) throw new ApiAuthError(404, 'NOT_FOUND', 'User not found')

  const activeTasks = taskCounts
    .filter((g) => g.status !== 'done' && g.status !== 'cancelled')
    .reduce((sum, g) => sum + g._count._all, 0)
  const completedTasks =
    taskCounts.find((g) => g.status === 'done')?._count._all ?? 0

  return {
    user,
    kpis: {
      activeTasks,
      completedTasks,
      overdueTasks: overdueCount,
      sessions: sessionCount,
    },
    recentActivity,
    recentSessions,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Daily summary — live computed (today / yesterday only)

const dailySummaryQuerySchema = z.object({
  date: z.enum(['today', 'yesterday']).optional().default('today'),
})

export type DailySummary = {
  date: string // YYYY-MM-DD in user's tz
  completedCount: number
  pendingCount: number
  deferredCount: number
  createdCount: number
  completedTitles: string[]
  pendingTitles: string[]
  deferredTitles: string[]
  tomorrowPreview: string[] // empty when date='yesterday'
}

function assertCanReadUserAggregates(ctx: AuthContext, id: string): void {
  if (
    ctx.kind === 'session' &&
    ctx.role !== 'admin' &&
    ctx.role !== 'developer' &&
    ctx.userId !== id
  ) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
  }
}

export async function getUserDailySummary(
  ctx: AuthContext,
  id: string,
  raw: unknown,
): Promise<DailySummary> {
  assertCanReadUserAggregates(ctx, id)
  const { date: which } = dailySummaryQuerySchema.parse(raw)

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, timezone: true },
  })
  if (!user) throw new ApiAuthError(404, 'NOT_FOUND', 'User not found')
  const tz = user.timezone || DEFAULT_TZ

  const now = new Date()
  // dayAnchor = the calendar day to summarize, expressed as the start-of-day
  // UTC instant in the user's tz.
  const today = startOfDayInTz(now, tz)
  const dayAnchor =
    which === 'today' ? today : addDaysInTz(today, -1, tz)
  const dayEnd = addDaysInTz(dayAnchor, 1, tz)

  // Date label that the agent can read back ("2026-04-23").
  const dateLabel = (() => {
    const iso = currentLocalTimeISO(tz, dayAnchor)
    return iso.slice(0, 10)
  })()

  const [
    completedTasks,
    pendingTasks,
    deferredTaskUpdates,
    createdCount,
    tomorrowTasks,
  ] = await Promise.all([
    withRetry(() =>
      prisma.task.findMany({
        where: {
          assignedToId: id,
          isDeleted: false,
          completedAt: { gte: dayAnchor, lt: dayEnd },
        },
        select: { id: true, title: true },
        take: 50,
        orderBy: { completedAt: 'desc' },
      }),
    ),
    // Pending: for "today" → currently pending/in_progress.
    //          for "yesterday" → tasks that were either still active at EOD
    //          OR completed AFTER yesterday's EOD (so they were still pending
    //          as of yesterday). Approximation per spec.
    withRetry(() =>
      which === 'today'
        ? prisma.task.findMany({
            where: {
              assignedToId: id,
              isDeleted: false,
              status: { in: ['pending', 'in_progress'] },
            },
            select: { id: true, title: true },
            take: 50,
            orderBy: [
              { deadline: { sort: 'asc', nulls: 'last' } },
              { priority: 'desc' },
            ],
          })
        : prisma.task.findMany({
            where: {
              assignedToId: id,
              isDeleted: false,
              OR: [
                { status: { in: ['pending', 'in_progress'] } },
                { status: 'done', completedAt: { gt: dayEnd } },
              ],
              createdAt: { lt: dayEnd },
            },
            select: { id: true, title: true },
            take: 50,
            orderBy: [
              { deadline: { sort: 'asc', nulls: 'last' } },
              { priority: 'desc' },
            ],
          }),
    ),
    withRetry(() =>
      prisma.taskUpdate.findMany({
        where: {
          updateType: 'deferred',
          createdAt: { gte: dayAnchor, lt: dayEnd },
          task: { assignedToId: id, isDeleted: false },
        },
        select: { task: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ),
    withRetry(() =>
      prisma.task.count({
        where: {
          assignedToId: id,
          isDeleted: false,
          createdAt: { gte: dayAnchor, lt: dayEnd },
        },
      }),
    ),
    // Tomorrow preview only relevant when summarizing today.
    which === 'today'
      ? withRetry(() => {
          const tomorrowStart = addDaysInTz(today, 1, tz)
          const tomorrowEnd = addDaysInTz(today, 2, tz)
          return prisma.task.findMany({
            where: {
              assignedToId: id,
              isDeleted: false,
              status: { in: ['pending', 'in_progress'] },
              deadline: { gte: tomorrowStart, lt: tomorrowEnd },
            },
            select: { title: true },
            take: 5,
            orderBy: [
              { priority: 'desc' },
              { deadline: { sort: 'asc', nulls: 'last' } },
            ],
          })
        })
      : Promise.resolve<{ title: string }[]>([]),
  ])

  // De-dupe deferred titles (one task may have been deferred multiple times
  // in the same day — we only want to mention it once).
  const deferredSeen = new Set<string>()
  const deferredTitles: string[] = []
  for (const u of deferredTaskUpdates) {
    if (!deferredSeen.has(u.task.id)) {
      deferredSeen.add(u.task.id)
      deferredTitles.push(u.task.title)
      if (deferredTitles.length >= 5) break
    }
  }

  return {
    date: dateLabel,
    completedCount: completedTasks.length,
    pendingCount: pendingTasks.length,
    deferredCount: deferredSeen.size,
    createdCount,
    completedTitles: completedTasks.slice(0, 5).map((t) => t.title),
    pendingTitles: pendingTasks.slice(0, 5).map((t) => t.title),
    deferredTitles,
    tomorrowPreview: tomorrowTasks.map((t) => t.title),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Recall a stored conversation summary by date

export type RecallDayPayload =
  | {
      found: true
      date: string
      summaryText: string
      keyDecisions: unknown
      taskStateSnapshot: unknown
      emotionalTone: string | null
      communicationPattern: string | null
    }
  | { found: false; date: string }

export async function recallDay(
  ctx: AuthContext,
  id: string,
  rawDate: string,
): Promise<RecallDayPayload> {
  assertCanReadUserAggregates(ctx, id)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    throw new ApiAuthError(400, 'BAD_REQUEST', 'date must be YYYY-MM-DD')
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, timezone: true },
  })
  if (!user) throw new ApiAuthError(404, 'NOT_FOUND', 'User not found')

  const tz = user.timezone || DEFAULT_TZ
  const dayStart = parseDateInTz(rawDate, tz)
  if (!dayStart) {
    throw new ApiAuthError(400, 'BAD_REQUEST', 'Invalid date')
  }

  const summary = await withRetry(() =>
    prisma.conversationSummary.findUnique({
      where: {
        userId_summaryDate: {
          userId: id,
          summaryDate: dayStart,
        },
      },
      select: {
        summaryText: true,
        keyDecisions: true,
        taskStateSnapshot: true,
        emotionalTone: true,
        communicationPattern: true,
      },
    }),
  )

  if (!summary) {
    return { found: false, date: rawDate }
  }
  return {
    found: true,
    date: rawDate,
    summaryText: summary.summaryText,
    keyDecisions: summary.keyDecisions,
    taskStateSnapshot: summary.taskStateSnapshot,
    emotionalTone: summary.emotionalTone,
    communicationPattern: summary.communicationPattern,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Agent bootstrap context — phone-keyed, single-shot

const agentContextQuerySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Phone must be E.164-ish, e.g. +919876543210')
    .optional(),
})

export type AgentContextPayload = {
  user: {
    id: string
    firstName: string
    displayName: string
    role: PublicUser['role']
    languagePref: PublicUser['languagePref']
    timezone: string
    voiceReplyEnabled: boolean
    currentLocalTime: string
  }
  taskState: {
    pendingCount: number
    inProgressCount: number
    deferredCount: number
    overdueCount: number
    urgentToday: {
      id: string
      title: string
      deadline: Date
      deadlineLocal: string
      priority: string
    }[]
  }
  recentSummaries: {
    date: string // YYYY-MM-DD
    summaryText: string
    keyDecisions: unknown
  }[]
  communicationPattern: string | null
}

export async function getAgentContext(
  ctx: AuthContext,
  raw: unknown,
): Promise<AgentContextPayload> {
  // Two callers:
  //   - apiKey (the voice agent): ALWAYS uses the verified `ctx.caller`. Any
  //     `?phone=` query the LLM might have constructed is ignored — the only
  //     identity that counts is the one bound by ElevenLabs to
  //     `system__caller_id`, which the model layer cannot forge.
  //   - admin/dev session: phone-keyed lookup is preserved so the dashboard
  //     can hydrate any user's bootstrap context for debugging.
  if (!isAdminish(ctx)) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
  }

  let user: {
    id: string
    displayName: string
    role: PublicUser['role']
    languagePref: PublicUser['languagePref']
    timezone: string
    voiceReplyEnabled: boolean
    isActive: boolean
  }

  if (ctx.kind === 'apiKey') {
    // requireApiAuth has already verified isActive and resolved the row.
    user = {
      id: ctx.caller.id,
      displayName: ctx.caller.displayName,
      role: ctx.caller.role,
      languagePref: ctx.caller.languagePref,
      timezone: ctx.caller.timezone,
      voiceReplyEnabled: ctx.caller.voiceReplyEnabled,
      isActive: ctx.caller.isActive,
    }
  } else {
    const { phone } = agentContextQuerySchema.parse(raw)
    if (!phone) {
      throw new ApiAuthError(
        400,
        'BAD_REQUEST',
        'phone query parameter is required for session callers',
      )
    }
    const stripped = phone.replace(/^\+/, '')
    const found = await withRetry(() =>
      prisma.user.findFirst({
        where: { phoneE164: { in: [stripped, `+${stripped}`] } },
        select: {
          id: true,
          displayName: true,
          role: true,
          languagePref: true,
          timezone: true,
          voiceReplyEnabled: true,
          isActive: true,
        },
      }),
    )
    if (!found) {
      throw new ApiAuthError(404, 'NOT_FOUND', 'User not recognized')
    }
    if (!found.isActive) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'User is inactive')
    }
    user = found
  }

  const tz = user.timezone || DEFAULT_TZ
  const now = new Date()
  const dayStart = startOfDayInTz(now, tz)
  const dayEnd = addDaysInTz(dayStart, 1, tz)

  const [taskCounts, deferredCount, overdueCount, urgentToday, summaries] =
    await Promise.all([
      withRetry(() =>
        prisma.task.groupBy({
          by: ['status'],
          where: { assignedToId: user.id, isDeleted: false },
          _count: { _all: true },
        }),
      ),
      withRetry(() =>
        prisma.task.count({
          where: {
            assignedToId: user.id,
            isDeleted: false,
            deferredTo: { not: null },
            status: { in: ['pending', 'in_progress'] },
          },
        }),
      ),
      withRetry(() =>
        prisma.task.count({
          where: {
            assignedToId: user.id,
            isDeleted: false,
            deadline: { lt: now },
            status: { in: ['pending', 'in_progress'] },
          },
        }),
      ),
      withRetry(() =>
        prisma.task.findMany({
          where: {
            assignedToId: user.id,
            isDeleted: false,
            priority: { in: ['high', 'urgent'] },
            deadline: { gte: dayStart, lt: dayEnd },
            status: { in: ['pending', 'in_progress'] },
          },
          select: {
            id: true,
            title: true,
            deadline: true,
            priority: true,
          },
          orderBy: { deadline: 'asc' },
          take: 5,
        }),
      ),
      withRetry(() =>
        prisma.conversationSummary.findMany({
          where: { userId: user.id },
          orderBy: { summaryDate: 'desc' },
          take: 3,
          select: {
            summaryDate: true,
            summaryText: true,
            keyDecisions: true,
            communicationPattern: true,
          },
        }),
      ),
    ])

  const pendingCount =
    taskCounts.find((g) => g.status === 'pending')?._count._all ?? 0
  const inProgressCount =
    taskCounts.find((g) => g.status === 'in_progress')?._count._all ?? 0

  return {
    user: {
      id: user.id,
      firstName: user.displayName.split(/\s+/)[0] ?? user.displayName,
      displayName: user.displayName,
      role: user.role,
      languagePref: user.languagePref,
      timezone: tz,
      voiceReplyEnabled: user.voiceReplyEnabled,
      currentLocalTime: currentLocalTimeISO(tz, now),
    },
    taskState: {
      pendingCount,
      inProgressCount,
      deferredCount,
      overdueCount,
      urgentToday: urgentToday
        .filter((t): t is typeof t & { deadline: Date } => t.deadline !== null)
        .map((t) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          deadlineLocal: formatLocal(t.deadline, tz, now),
          priority: t.priority,
        })),
    },
    recentSummaries: summaries.map((s) => ({
      date: s.summaryDate.toISOString().slice(0, 10),
      summaryText: s.summaryText,
      keyDecisions: s.keyDecisions,
    })),
    communicationPattern: summaries[0]?.communicationPattern ?? null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Mutations

function mapPrismaUniqueViolation(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = error.meta?.target
    const field = Array.isArray(target)
      ? target[0]
      : typeof target === 'string'
        ? target
        : 'value'
    throw new ApiAuthError(
      409,
      'CONFLICT',
      `A user with that ${String(field)} already exists`,
    )
  }
  throw error
}

export async function createUser(
  ctx: AuthContext,
  raw: unknown,
): Promise<PublicUser> {
  if (ctx.kind === 'apiKey') {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Agents cannot onboard users')
  }
  if (!isAdminish(ctx)) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Only admin or developer can create users')
  }

  const data = createUserSchema.parse(raw)
  // phoneE164: store with leading `+` to keep new rows compliant with the
  // E.164 spec the schema comment promises, even if older seed rows omitted it.
  const phoneE164 = data.phoneE164.startsWith('+')
    ? data.phoneE164
    : `+${data.phoneE164}`

  try {
    return await prisma.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        phoneE164,
        role: data.role,
        teamId: data.teamId ?? null,
        languagePref: data.languagePref,
        timezone: data.timezone,
        voiceReplyEnabled: data.voiceReplyEnabled,
        image: data.image ?? null,
        isActive: true,
      },
      select: userPublic,
    })
  } catch (error) {
    mapPrismaUniqueViolation(error)
  }
}

export async function updateUser(
  ctx: AuthContext,
  id: string,
  raw: unknown,
): Promise<PublicUser> {
  // Capability:
  //   - admin/developer SESSION → full update surface
  //   - apiKey                  → preferences only (NOT adminish for users:
  //                               agents must never escalate roles or flip
  //                               isActive — that lives with humans)
  //   - any other session       → preferences only on the caller's own row;
  //                               403 if targeting someone else
  const isAdminSession =
    ctx.kind === 'session' &&
    (ctx.role === 'admin' || ctx.role === 'developer')

  if (!isAdminSession) {
    if (ctx.kind === 'session' && ctx.userId !== id) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Cannot edit another user')
    }

    // Reject any field outside the prefs allow-list before we strip it away —
    // better UX than a silent no-op, and gives the caller a clear signal that
    // their permissions are narrower than they assumed.
    if (typeof raw === 'object' && raw !== null) {
      for (const key of Object.keys(raw as object)) {
        if (!(USER_PREFS_FIELDS as readonly string[]).includes(key)) {
          throw new ApiAuthError(
            403,
            'FORBIDDEN',
            `Cannot edit field: ${key}`,
          )
        }
      }
    }

    const patch = userPrefsSchema.parse(raw)
    return applyUserUpdate(id, patch)
  }

  // Admin / developer session: full surface.
  const patch = userAdminUpdateSchema.parse(raw)
  return applyUserUpdate(id, patch)
}

async function applyUserUpdate(
  id: string,
  patch: Record<string, unknown>,
): Promise<PublicUser> {
  // Confirm the target exists; surfaces a 404 instead of an opaque P2025.
  const exists = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!exists) throw new ApiAuthError(404, 'NOT_FOUND', 'User not found')

  // Normalise phone if present.
  const data: Prisma.UserUpdateInput = { ...(patch as Prisma.UserUpdateInput) }
  if (typeof patch.phoneE164 === 'string') {
    data.phoneE164 = patch.phoneE164.startsWith('+')
      ? patch.phoneE164
      : `+${patch.phoneE164}`
  }

  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: userPublic,
    })
  } catch (error) {
    mapPrismaUniqueViolation(error)
  }
}

export async function deactivateUser(
  ctx: AuthContext,
  id: string,
): Promise<{ ok: true }> {
  if (ctx.kind === 'apiKey') {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Agents cannot deactivate users',
    )
  }
  if (!isAdminish(ctx)) {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Only admin or developer can deactivate users',
    )
  }
  // Self-deactivation guard: never let an admin lock themselves out via the
  // dashboard. They can revert via Prisma Studio or another admin if needed.
  if (ctx.kind === 'session' && ctx.userId === id) {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'You cannot deactivate yourself',
    )
  }

  const exists = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!exists) throw new ApiAuthError(404, 'NOT_FOUND', 'User not found')

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  })
  return { ok: true }
}

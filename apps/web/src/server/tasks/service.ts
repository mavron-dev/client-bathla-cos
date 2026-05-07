import { prisma, withRetry } from '@/lib/prisma'
import {
  ApiAuthError,
  actorAttribution,
  isAdminish,
  type AuthContext,
} from '@/lib/api-auth'
import type { Prisma } from '@bathla-cos/database'
import {
  startOfDayInTz,
  endOfDayInTz,
  addDaysInTz,
} from '@/lib/time-tz'
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  deferTaskSchema,
  listTasksQuerySchema,
  type UpdateTaskInput,
  type UpdateStatusInput,
} from './schemas'

const DEFAULT_TZ = 'Asia/Kolkata'

/**
 * Task service layer.
 *
 * Pure functions: each takes an explicit `AuthContext`, runs RBAC + ownership
 * checks, and (for mutations) writes a `TaskUpdate` audit row in the same
 * transaction as the mutation so the log can never desync.
 *
 * Used by:
 *   - API route handlers under `app/api/tasks/*` (with apiKey OR session ctx)
 *   - Dashboard server components under `app/(admin|executive)/tasks/page.tsx`
 *     (with a session-derived ctx; no HTTP roundtrip)
 */

const taskInclude = {
  assignee: {
    select: { id: true, displayName: true, image: true, email: true },
  },
  creator: {
    select: { id: true, displayName: true },
  },
} satisfies Prisma.TaskInclude

const taskIncludeWithUpdates = {
  ...taskInclude,
  updates: {
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      updatedBy: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.TaskInclude

export type TaskWithUsers = Prisma.TaskGetPayload<{ include: typeof taskInclude }>
export type TaskWithUpdates = Prisma.TaskGetPayload<{
  include: typeof taskIncludeWithUpdates
}>

const EXEC_EDITABLE_FIELDS = ['description', 'deadline', 'status'] as const

// ────────────────────────────────────────────────────────────────────────────
// Read

export async function listTasks(
  ctx: AuthContext,
  raw: unknown,
): Promise<TaskWithUsers[]> {
  const q = listTasksQuerySchema.parse(raw)

  const where: Prisma.TaskWhereInput = { isDeleted: false }
  if (q.status) {
    where.status = Array.isArray(q.status) ? { in: q.status } : q.status
  }
  if (q.priority) {
    where.priority = Array.isArray(q.priority) ? { in: q.priority } : q.priority
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
    ]
  }

  if (ctx.kind === 'session' && !isAdminish(ctx)) {
    // Executive: forced to own tasks. Ignore any client-supplied assignedToId
    // (defense against IDOR via querystring tampering).
    where.assignedToId = ctx.userId
  } else if (q.assignedToId) {
    where.assignedToId = q.assignedToId
  }

  // Semantic filter (today / this_week / overdue / pending / all). Computed in
  // the assignee's tz when we have one; otherwise the session user's; else
  // the project default. Layered on top of any explicit `status` filter — if
  // the caller passed both, both apply.
  if (q.filter) {
    const tz = await resolveCallerTz(ctx, where.assignedToId as string | undefined)
    const now = new Date()
    const activeStatuses: Prisma.TaskWhereInput['status'] = {
      in: ['pending', 'in_progress'],
    }
    if (q.filter === 'today') {
      const start = startOfDayInTz(now, tz)
      const end = addDaysInTz(start, 1, tz)
      where.deadline = { gte: start, lt: end }
      where.status ??= activeStatuses
    } else if (q.filter === 'this_week') {
      const start = startOfDayInTz(now, tz)
      const end = addDaysInTz(start, 7, tz)
      where.deadline = { gte: start, lt: end }
      where.status ??= activeStatuses
    } else if (q.filter === 'overdue') {
      where.deadline = { lt: now }
      where.status ??= activeStatuses
    } else if (q.filter === 'pending') {
      where.status ??= activeStatuses
    }
    // 'all' adds no filter.
  }

  return withRetry(() =>
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [
        { deadline: { sort: 'asc', nulls: 'last' } },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: q.limit,
    }),
  )
}

/**
 * Resolve the timezone to use for date-bucketed filters. Prefers the assignee
 * (because the agent passes assignedToId and "today" means the user's today),
 * then the session user, finally the project default.
 */
async function resolveCallerTz(
  ctx: AuthContext,
  assignedToId?: string,
): Promise<string> {
  if (assignedToId) {
    const u = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { timezone: true },
    })
    if (u?.timezone) return u.timezone
  }
  if (ctx.kind === 'session') {
    const u = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { timezone: true },
    })
    if (u?.timezone) return u.timezone
  }
  return DEFAULT_TZ
}

export async function getTask(
  ctx: AuthContext,
  id: string,
): Promise<TaskWithUpdates> {
  const task = await withRetry(() =>
    prisma.task.findUnique({
      where: { id },
      include: taskIncludeWithUpdates,
    }),
  )
  if (!task || task.isDeleted) {
    throw new ApiAuthError(404, 'NOT_FOUND', 'Task not found')
  }
  if (
    ctx.kind === 'session' &&
    !isAdminish(ctx) &&
    task.assignedToId !== ctx.userId
  ) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Not your task')
  }
  return task
}

// ────────────────────────────────────────────────────────────────────────────
// Mutations

export async function createTask(
  ctx: AuthContext,
  raw: unknown,
): Promise<TaskWithUsers> {
  if (!isAdminish(ctx)) {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Only admin or agent can create tasks',
    )
  }
  const data = createTaskSchema.parse(raw)
  const { actorId, source } = actorAttribution(ctx)

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        assignedToId: data.assignedToId,
        priority: data.priority ?? 'medium',
        status: data.status ?? 'pending',
        deadline: data.deadline ?? null,
        tags: data.tags ?? [],
        source,
        createdById: actorId,
      },
      include: taskInclude,
    })
    await tx.taskUpdate.create({
      data: {
        taskId: task.id,
        updatedById: actorId,
        updateType: 'created',
        source,
        newValue: data as unknown as Prisma.InputJsonValue,
      },
    })
    return task
  })
}

export async function updateTaskFields(
  ctx: AuthContext,
  id: string,
  raw: unknown,
): Promise<TaskWithUsers> {
  const patch = updateTaskSchema.parse(raw)
  return applyTaskUpdate(ctx, id, patch)
}

export async function updateTaskStatus(
  ctx: AuthContext,
  id: string,
  raw: unknown,
): Promise<TaskWithUsers> {
  const parsed = updateStatusSchema.parse(raw)
  const patch: UpdateTaskInput & Partial<UpdateStatusInput> = {
    status: parsed.status,
  }
  // deferredTo is task-side metadata (not in updateTaskSchema), but
  // applyTaskUpdate handles it explicitly when present.
  return applyTaskUpdate(ctx, id, patch, {
    deferredToOverride: parsed.deferredTo ?? null,
  })
}

/**
 * Defer a task to a future deadline. Mirrors the agent spec's `defer_task`:
 *   - `deadline` is updated AND `deferredTo` is set to the same value
 *   - `status` is intentionally unchanged (a pending task stays pending)
 *   - `done` and `cancelled` tasks cannot be deferred
 *   - audit log entry with `updateType='deferred'`, capturing the old deadline
 */
export async function deferTask(
  ctx: AuthContext,
  id: string,
  raw: unknown,
): Promise<TaskWithUsers> {
  const { deferTo, reason } = deferTaskSchema.parse(raw)

  // Reject past or near-now defers (1-minute cushion).
  const minAllowed = new Date(Date.now() + 60_000)
  if (deferTo < minAllowed) {
    throw new ApiAuthError(
      400,
      'BAD_REQUEST',
      'deferTo must be at least 1 minute in the future',
    )
  }

  const current = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      deadline: true,
      deferredTo: true,
      assignedToId: true,
      isDeleted: true,
    },
  })
  if (!current || current.isDeleted) {
    throw new ApiAuthError(404, 'NOT_FOUND', 'Task not found')
  }

  // RBAC: admin/dev or apiKey can defer any task; an executive session can
  // only defer their own.
  if (!isAdminish(ctx)) {
    if (ctx.kind !== 'session' || current.assignedToId !== ctx.userId) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Not your task')
    }
  }

  if (current.status === 'done' || current.status === 'cancelled') {
    throw new ApiAuthError(
      400,
      'BAD_REQUEST',
      `Cannot defer a ${current.status} task`,
    )
  }

  const { actorId, source } = actorAttribution(ctx)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data: {
        deadline: deferTo,
        deferredTo: deferTo,
        // status: intentionally unchanged (per agent spec)
      },
      include: taskInclude,
    })
    await tx.taskUpdate.create({
      data: {
        taskId: id,
        updatedById: actorId,
        updateType: 'deferred',
        source,
        oldValue: {
          deadline: current.deadline?.toISOString() ?? null,
          deferredTo: current.deferredTo?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
        newValue: {
          deadline: deferTo.toISOString(),
          deferredTo: deferTo.toISOString(),
          reason: reason ?? null,
        } as Prisma.InputJsonValue,
      },
    })
    return updated
  })
}

export async function deleteTask(
  ctx: AuthContext,
  id: string,
): Promise<{ ok: true }> {
  if (!isAdminish(ctx)) {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Only admin or agent can delete tasks',
    )
  }
  const cur = await prisma.task.findUnique({
    where: { id },
    select: { id: true, isDeleted: true },
  })
  if (!cur || cur.isDeleted) {
    throw new ApiAuthError(404, 'NOT_FOUND', 'Task not found')
  }
  const { actorId, source } = actorAttribution(ctx)
  await prisma.$transaction([
    prisma.task.update({ where: { id }, data: { isDeleted: true } }),
    prisma.taskUpdate.create({
      data: {
        taskId: id,
        updatedById: actorId,
        updateType: 'deleted',
        source,
      },
    }),
  ])
  return { ok: true }
}

// ────────────────────────────────────────────────────────────────────────────
// Internal: shared mutation path used by updateTaskFields + updateTaskStatus

async function applyTaskUpdate(
  ctx: AuthContext,
  id: string,
  patch: UpdateTaskInput,
  opts?: { deferredToOverride?: Date | null },
): Promise<TaskWithUsers> {
  const current = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      isDeleted: true,
    },
  })
  if (!current || current.isDeleted) {
    throw new ApiAuthError(404, 'NOT_FOUND', 'Task not found')
  }

  // Authorization
  if (!isAdminish(ctx)) {
    if (ctx.kind !== 'session' || current.assignedToId !== ctx.userId) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Not your task')
    }
    for (const k of Object.keys(patch) as (keyof UpdateTaskInput)[]) {
      if (!(EXEC_EDITABLE_FIELDS as readonly string[]).includes(k)) {
        throw new ApiAuthError(403, 'FORBIDDEN', `Cannot edit field: ${k}`)
      }
    }
  }

  const data: Prisma.TaskUpdateInput = {}
  if (patch.title !== undefined) data.title = patch.title
  if (patch.description !== undefined) data.description = patch.description
  if (patch.priority !== undefined) data.priority = patch.priority
  if (patch.status !== undefined) data.status = patch.status
  if (patch.deadline !== undefined) data.deadline = patch.deadline
  if (patch.tags !== undefined) data.tags = patch.tags
  if (patch.assignedToId !== undefined) {
    data.assignee = { connect: { id: patch.assignedToId } }
  }

  // completedAt is server-managed: set when entering 'done', cleared when
  // leaving it.
  if (patch.status && patch.status !== current.status) {
    if (patch.status === 'done') data.completedAt = new Date()
    else if (current.status === 'done') data.completedAt = null
  }

  // deferredTo: cleared if status moves away from 'deferred', otherwise apply
  // the explicit override from updateStatusSchema (if provided).
  if (patch.status && patch.status !== 'deferred') {
    data.deferredTo = null
  } else if (opts?.deferredToOverride !== undefined) {
    data.deferredTo = opts.deferredToOverride
  }

  const isStatusChange =
    patch.status !== undefined && patch.status !== current.status

  const { actorId, source } = actorAttribution(ctx)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data,
      include: taskInclude,
    })
    await tx.taskUpdate.create({
      data: {
        taskId: id,
        updatedById: actorId,
        updateType: isStatusChange ? 'status_changed' : 'edited',
        source,
        oldValue: { status: current.status } as Prisma.InputJsonValue,
        newValue: patch as unknown as Prisma.InputJsonValue,
      },
    })
    return updated
  })
}

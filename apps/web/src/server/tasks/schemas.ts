import { z } from 'zod'
import { TaskStatus, TaskPriority } from '@bathla-cos/database'

/**
 * Shared zod schemas for the Task feature.
 *
 * Both the API route handlers (server-side validation) and the dashboard
 * dialog forms (client-side validation) import from this file so the contract
 * is enforced in one place. The Prisma enums above are re-asserted with
 * `satisfies` so this file fails to compile if a status/priority is added or
 * removed in the schema without an accompanying update here.
 */

export const taskStatusValues = [
  'pending',
  'in_progress',
  'done',
  'deferred',
  'cancelled',
] as const satisfies readonly TaskStatus[]

export const taskPriorityValues = [
  'low',
  'medium',
  'high',
  'urgent',
] as const satisfies readonly TaskPriority[]

export const taskStatusSchema = z.enum(taskStatusValues)
export const taskPrioritySchema = z.enum(taskPriorityValues)

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  assignedToId: z.string().uuid(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  deadline: z.coerce.date().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
})

export const updateTaskSchema = createTaskSchema.partial()

export const updateStatusSchema = z.object({
  status: taskStatusSchema,
  deferredTo: z.coerce.date().optional().nullable(),
})

/**
 * Defer body. Mirrors the agent spec's `defer_task` tool: the new deadline
 * must be in the future (cushioned by 1 minute) and an optional `reason`
 * captures the conversational why.
 */
export const deferTaskSchema = z.object({
  deferTo: z.coerce.date(),
  reason: z.string().trim().max(500).optional().nullable(),
})

const statusFilter = z.union([
  taskStatusSchema,
  z.array(taskStatusSchema),
])
const priorityFilter = z.union([
  taskPrioritySchema,
  z.array(taskPrioritySchema),
])

/**
 * Semantic filter buckets the agent uses ("what's due today / this week /
 * overdue"). They're computed in the caller's timezone at query time. `all`
 * is included for completeness but redundant when no other filter is set.
 */
export const taskSemanticFilterSchema = z.enum([
  'today',
  'this_week',
  'pending',
  'overdue',
  'all',
])

export const listTasksQuerySchema = z.object({
  status: statusFilter.optional(),
  priority: priorityFilter.optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  filter: taskSemanticFilterSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type DeferTaskInput = z.infer<typeof deferTaskSchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type TaskSemanticFilter = z.infer<typeof taskSemanticFilterSchema>

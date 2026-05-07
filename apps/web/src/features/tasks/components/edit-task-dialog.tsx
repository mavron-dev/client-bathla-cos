'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { IconCalendar } from '@tabler/icons-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { updateTaskSchema, type UpdateTaskInput } from '@/server/tasks/schemas'

type FormValues = z.input<typeof updateTaskSchema>
import { tasksApi, ApiClientError } from '../lib/api-client'
import { asDate } from '../lib/dates'
import {
  TASK_COLUMNS,
  TASK_PRIORITY_META,
  type PublicUser,
  type TaskMode,
  type TaskWithUsers,
} from '../types'

interface EditTaskDialogProps {
  task: TaskWithUsers | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  mode: TaskMode
  /** Required when mode === 'admin' (used for the assignee dropdown). */
  users?: PublicUser[]
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onSuccess,
  mode,
  users = [],
}: EditTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues, unknown, UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {},
  })

  useEffect(() => {
    if (!task) return
    form.reset({
      title: task.title,
      description: task.description ?? '',
      assignedToId: task.assignedToId,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline ?? null,
      tags: task.tags,
    })
  }, [task, form])

  const onSubmit = async (data: UpdateTaskInput) => {
    if (!task) return
    setIsSubmitting(true)
    try {
      // For executive mode, only allow description, deadline, status to be sent
      const payload =
        mode === 'executive'
          ? {
              description: data.description,
              deadline: data.deadline,
              status: data.status,
            }
          : data
      await tasksApi.update(task.id, payload)
      toast.success('Task updated')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const msg =
        error instanceof ApiClientError ? error.message : 'Failed to update task'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!task) return null

  const adminFieldsDisabled = mode === 'executive'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            {mode === 'admin'
              ? 'Update the task. Click save when done.'
              : 'Update the description, deadline, or status of your task.'}
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    disabled={adminFieldsDisabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  {adminFieldsDisabled ? (
                    <Input
                      value={task.assignee.displayName}
                      disabled
                      readOnly
                    />
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  {adminFieldsDisabled ? (
                    <Input
                      value={TASK_PRIORITY_META[task.priority].label}
                      disabled
                      readOnly
                    />
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TASK_PRIORITY_META).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_COLUMNS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <IconCalendar className="mr-2 h-4 w-4" />
                          {(() => {
                            const d = asDate(field.value)
                            return d ? format(d, 'PP') : 'Pick a date'
                          })()}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={asDate(field.value)}
                        onSelect={(d) => field.onChange(d ?? null)}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

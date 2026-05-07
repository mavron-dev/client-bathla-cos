'use client'

import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconDots,
  IconPencil,
  IconTrash,
  IconRobot,
} from '@tabler/icons-react'
import { format, isPast } from 'date-fns'
import {
  TASK_COLUMNS,
  TASK_PRIORITY_META,
  type TaskMode,
  type TaskWithUsers,
} from '../types'

type SortKey = 'title' | 'assignee' | 'priority' | 'status' | 'deadline' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface TasksTableProps {
  tasks: TaskWithUsers[]
  mode: TaskMode
  onView?: (task: TaskWithUsers) => void
  onEdit?: (task: TaskWithUsers) => void
  onDelete?: (taskId: string) => void
}

function getStatusBadge(status: TaskWithUsers['status']) {
  const col = TASK_COLUMNS.find((c) => c.id === status)
  return (
    <Badge variant="secondary" className={`capitalize ${col?.headerClass ?? ''}`}>
      {col?.title ?? status}
    </Badge>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function compareBy(a: TaskWithUsers, b: TaskWithUsers, key: SortKey): number {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title)
    case 'assignee':
      return a.assignee.displayName.localeCompare(b.assignee.displayName)
    case 'priority':
      return (
        TASK_PRIORITY_META[a.priority].weight -
        TASK_PRIORITY_META[b.priority].weight
      )
    case 'status':
      return a.status.localeCompare(b.status)
    case 'deadline': {
      const ax = a.deadline ? new Date(a.deadline).getTime() : Infinity
      const bx = b.deadline ? new Date(b.deadline).getTime() : Infinity
      return ax - bx
    }
    case 'createdAt':
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  }
}

export function TasksTable({
  tasks,
  mode,
  onView,
  onEdit,
  onDelete,
}: TasksTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const out = [...tasks]
    out.sort((a, b) => {
      const cmp = compareBy(a, b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }, [tasks, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortHeader = ({
    label,
    keyName,
  }: {
    label: string
    keyName: SortKey
  }) => {
    const Icon =
      sortKey === keyName
        ? sortDir === 'asc'
          ? IconArrowUp
          : IconArrowDown
        : IconArrowsSort
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground"
        onClick={() => toggleSort(keyName)}
      >
        {label}
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </button>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortHeader label="Title" keyName="title" /></TableHead>
            <TableHead><SortHeader label="Assignee" keyName="assignee" /></TableHead>
            <TableHead><SortHeader label="Priority" keyName="priority" /></TableHead>
            <TableHead><SortHeader label="Status" keyName="status" /></TableHead>
            <TableHead><SortHeader label="Deadline" keyName="deadline" /></TableHead>
            <TableHead><SortHeader label="Created" keyName="createdAt" /></TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No tasks found.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((task) => {
              const overdue =
                !!task.deadline &&
                task.status !== 'done' &&
                isPast(new Date(task.deadline))
              return (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onView?.(task)}
                >
                  <TableCell className="max-w-[280px]">
                    <div className="flex flex-col">
                      <span className="truncate font-medium">{task.title}</span>
                      {task.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {task.assignee.image && (
                          <AvatarImage
                            src={task.assignee.image}
                            alt={task.assignee.displayName}
                          />
                        )}
                        <AvatarFallback className="text-[10px]">
                          {initials(task.assignee.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${TASK_PRIORITY_META[task.priority].badgeClass}`}
                    >
                      {TASK_PRIORITY_META[task.priority].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>
                    {task.deadline ? (
                      <span
                        className={`text-sm ${
                          overdue ? 'text-red-600 dark:text-red-400' : ''
                        }`}
                      >
                        {format(new Date(task.deadline), 'd MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {!task.creator && <IconRobot className="h-3.5 w-3.5" />}
                      <span>{format(new Date(task.createdAt), 'd MMM')}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {mode === 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <IconDots className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit?.(task)}>
                            <IconPencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDelete?.(task.id)}
                          >
                            <IconTrash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

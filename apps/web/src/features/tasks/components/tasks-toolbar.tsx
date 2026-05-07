'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Separator } from '@/components/ui/separator'
import {
  IconSearch,
  IconFilter,
  IconLayoutKanban,
  IconTable,
  IconCheck,
  IconPlus,
  IconBolt,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useTaskFiltersStore } from '../store'
import {
  TASK_COLUMNS,
  TASK_PRIORITY_META,
  type TaskMode,
  type TaskViewMode,
} from '../types'
import type { TaskStatus, TaskPriority } from '@bathla-cos/database'

interface TasksToolbarProps {
  totalTasks: number
  mode: TaskMode
  onAddTask?: () => void
}

export function TasksToolbar({
  totalTasks,
  mode,
  onAddTask,
}: TasksToolbarProps) {
  const {
    viewMode,
    setViewMode,
    filters,
    setSearch,
    setStatusFilter,
    setPriorityFilter,
  } = useTaskFiltersStore()

  const handleStatusToggle = (id: TaskStatus) => {
    setStatusFilter(
      filters.status.includes(id)
        ? filters.status.filter((s) => s !== id)
        : [...filters.status, id],
    )
  }

  const handlePriorityToggle = (id: TaskPriority) => {
    setPriorityFilter(
      filters.priority.includes(id)
        ? filters.priority.filter((p) => p !== id)
        : [...filters.priority, id],
    )
  }

  const handleViewChange = (value: string) => {
    if (value) setViewMode(value as TaskViewMode)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed min-w-[140px] justify-start"
            >
              <IconFilter className="mr-2 h-4 w-4" />
              {filters.status.length > 0 ? (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {filters.status.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    {filters.status.length > 2 ? (
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {filters.status.length} selected
                      </Badge>
                    ) : (
                      TASK_COLUMNS.filter((c) =>
                        filters.status.includes(c.id),
                      ).map((c) => (
                        <Badge
                          key={c.id}
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {c.title}
                        </Badge>
                      ))
                    )}
                  </div>
                </>
              ) : (
                'All Status'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter status..." />
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {TASK_COLUMNS.map((col) => {
                    const isSelected = filters.status.includes(col.id)
                    return (
                      <CommandItem
                        key={col.id}
                        onSelect={() => handleStatusToggle(col.id)}
                      >
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible',
                          )}
                        >
                          <IconCheck className="h-4 w-4" />
                        </div>
                        {col.title}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {filters.status.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => setStatusFilter([])}
                        className="justify-center text-center"
                      >
                        Clear filters
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Priority multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed min-w-[120px] justify-start"
            >
              <IconBolt className="mr-2 h-4 w-4" />
              {filters.priority.length > 0
                ? `Priority (${filters.priority.length})`
                : 'All Priorities'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter priority..." />
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {Object.values(TASK_PRIORITY_META).map((p) => {
                    const isSelected = filters.priority.includes(p.id)
                    return (
                      <CommandItem
                        key={p.id}
                        onSelect={() => handlePriorityToggle(p.id)}
                      >
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible',
                          )}
                        >
                          <IconCheck className="h-4 w-4" />
                        </div>
                        {p.label}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {filters.priority.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => setPriorityFilter([])}
                        className="justify-center text-center"
                      >
                        Clear filters
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
        </span>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewChange}
          className="rounded-lg border"
        >
          <ToggleGroupItem
            value="kanban"
            aria-label="Kanban view"
            className="gap-2 px-3"
          >
            <IconLayoutKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="table"
            aria-label="Table view"
            className="gap-2 px-3"
          >
            <IconTable className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {mode === 'admin' && (
          <Button onClick={onAddTask} className="gap-2">
            <IconPlus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>
    </div>
  )
}

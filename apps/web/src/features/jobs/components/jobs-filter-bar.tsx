'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  IconSearch,
  IconX,
  IconChevronDown,
  IconCheck,
  IconUser,
} from '@tabler/icons-react'
import { JobStatus } from '@bathla-cos/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  patchSearchParams,
  searchParamsToString,
} from '@/features/jobs/lib/url-state'
import { JOB_TYPE_OPTIONS } from '@/features/jobs/lib/job-outcome-schemas'
import type { JobUserOption } from '@/lib/dashboard/jobs'

const STATUS_OPTIONS: Array<{ value: JobStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
]

const DATE_PRESETS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const
type DatePreset = (typeof DATE_PRESETS)[number]['value']

export function JobsFilterBar({ users }: { users: JobUserOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const selectedTypes = sp.getAll('type')
  const selectedStatuses = sp.getAll('status')
  const selectedUserId = sp.get('userId') ?? ''
  const selectedRange = (sp.get('range') ?? 'all') as DatePreset

  const [search, setSearch] = React.useState(sp.get('search') ?? '')

  // Debounced search → URL
  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = patchSearchParams(sp, { search: search || null })
      router.replace(`${pathname}${searchParamsToString(next)}`)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const apply = (patch: Record<string, string | string[] | null>) => {
    const next = patchSearchParams(sp, patch)
    router.replace(`${pathname}${searchParamsToString(next)}`)
  }

  const toggleArray = (key: string, current: string[], value: string) => {
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    apply({ [key]: updated.length === 0 ? null : updated })
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const hasAny =
    search ||
    selectedTypes.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedUserId ||
    selectedRange !== 'all'

  const clearAll = () => {
    setSearch('')
    router.replace(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 max-w-xs">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search error / external id…"
          className="pl-8 text-xs"
        />
      </div>

      <MultiSelectFilter
        label="Type"
        options={JOB_TYPE_OPTIONS}
        selected={selectedTypes}
        onToggle={(v) => toggleArray('type', selectedTypes, v)}
        onClear={() => apply({ type: null })}
      />

      <MultiSelectFilter
        label="Status"
        options={STATUS_OPTIONS}
        selected={selectedStatuses}
        onToggle={(v) => toggleArray('status', selectedStatuses, v)}
        onClear={() => apply({ status: null })}
      />

      <UserCombobox
        users={users}
        selectedId={selectedUserId}
        selectedName={selectedUser?.displayName ?? null}
        onSelect={(id) => apply({ userId: id })}
      />

      <Select
        value={selectedRange}
        onValueChange={(v) => apply({ range: v === 'all' ? null : v })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <IconX className="size-4" />
          Clear
        </Button>
      )}
    </div>
  )
}

function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 justify-between gap-2',
            selected.length > 0 && 'border-primary/40',
          )}
        >
          <span className="text-xs">{label}</span>
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="h-5 rounded-sm px-1 text-[10px]"
            >
              {selected.length}
            </Badge>
          )}
          <IconChevronDown className="size-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="space-y-1">
          {options.map((opt) => {
            const checked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
        {selected.length > 0 && (
          <>
            <div className="bg-border -mx-2 my-2 h-px" />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full justify-center"
              onClick={onClear}
            >
              Clear {label.toLowerCase()}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function UserCombobox({
  users,
  selectedId,
  selectedName,
  onSelect,
}: {
  users: JobUserOption[]
  selectedId: string
  selectedName: string | null
  onSelect: (id: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 max-w-[180px] justify-between gap-2',
            selectedId && 'border-primary/40',
          )}
        >
          <IconUser className="size-3.5 opacity-60" />
          <span className="truncate text-xs">
            {selectedName || 'User'}
          </span>
          <IconChevronDown className="size-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Find user…" />
          <CommandList>
            <CommandEmpty>No users with jobs yet.</CommandEmpty>
            <CommandGroup>
              {selectedId && (
                <CommandItem
                  onSelect={() => {
                    onSelect(null)
                    setOpen(false)
                  }}
                  className="text-muted-foreground"
                >
                  <IconX className="size-3.5" /> Clear selection
                </CommandItem>
              )}
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.displayName} ${u.id}`}
                  onSelect={() => {
                    onSelect(u.id)
                    setOpen(false)
                  }}
                >
                  <IconCheck
                    className={cn(
                      'size-3.5',
                      selectedId === u.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{u.displayName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { IconChevronDown, IconCheck, IconUser } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { SummaryUserOption } from '@/lib/dashboard/summaries'

export function SummaryUserPicker({
  users,
  selectedId,
}: {
  users: SummaryUserOption[]
  selectedId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [open, setOpen] = React.useState(false)

  const selected = users.find((u) => u.id === selectedId)

  const select = (id: string) => {
    const next = new URLSearchParams(sp.toString())
    next.set('userId', id)
    // Clear date when switching users — the previous user's date may not have
    // a summary for the new user, and the page falls back gracefully.
    next.delete('date')
    router.replace(`${pathname}?${next.toString()}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[240px] justify-between gap-2"
        >
          <IconUser className="size-3.5 opacity-60" />
          <span className="truncate text-xs">
            {selected?.displayName ?? 'Pick a user'}
          </span>
          <IconChevronDown className="size-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Find user…" />
          <CommandList>
            <CommandEmpty>No active users.</CommandEmpty>
            <CommandGroup>
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.displayName} ${u.id}`}
                  onSelect={() => select(u.id)}
                >
                  <IconCheck
                    className={cn(
                      'size-3.5',
                      selectedId === u.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{u.displayName}</span>
                  <span className="text-muted-foreground ml-auto text-[10px]">
                    {u.timezone}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

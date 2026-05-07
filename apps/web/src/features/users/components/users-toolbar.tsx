'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  IconSearch,
  IconFilter,
  IconCheck,
  IconUserPlus,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useUserFiltersStore } from '../store'
import { USER_ROLE_META, type UserStatusFilter } from '../types'
import type { UserRole } from '@bathla-cos/database'

interface UsersToolbarProps {
  totalUsers: number
  onAddUser?: () => void
}

export function UsersToolbar({ totalUsers, onAddUser }: UsersToolbarProps) {
  const { search, roles, status, setSearch, setRoles, setStatus } =
    useUserFiltersStore()

  const handleRoleToggle = (role: UserRole) => {
    setRoles(roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role])
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed min-w-[140px] justify-start"
            >
              <IconFilter className="mr-2 h-4 w-4" />
              {roles.length > 0 ? (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {roles.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    {roles.length > 2 ? (
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {roles.length} selected
                      </Badge>
                    ) : (
                      Object.values(USER_ROLE_META)
                        .filter((r) => roles.includes(r.id))
                        .map((r) => (
                          <Badge
                            key={r.id}
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                          >
                            {r.label}
                          </Badge>
                        ))
                    )}
                  </div>
                </>
              ) : (
                'All Roles'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter role..." />
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {Object.values(USER_ROLE_META).map((r) => {
                    const isSelected = roles.includes(r.id)
                    return (
                      <CommandItem
                        key={r.id}
                        onSelect={() => handleRoleToggle(r.id)}
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
                        {r.label}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {roles.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => setRoles([])}
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

        {/* Status select */}
        <Select value={status} onValueChange={(v) => setStatus(v as UserStatusFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {totalUsers} {totalUsers === 1 ? 'user' : 'users'}
        </span>
        {onAddUser && (
          <Button onClick={onAddUser} className="gap-2">
            <IconUserPlus className="h-4 w-4" />
            Invite User
          </Button>
        )}
      </div>
    </div>
  )
}

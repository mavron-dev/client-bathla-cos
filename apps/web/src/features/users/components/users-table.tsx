'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  IconUserOff,
  IconExternalLink,
} from '@tabler/icons-react'
import { USER_ROLE_META, type PublicUser } from '../types'

type SortKey = 'displayName' | 'email' | 'role' | 'isActive'
type SortDir = 'asc' | 'desc'

interface UsersTableProps {
  users: PublicUser[]
  onEdit?: (user: PublicUser) => void
  onDeactivate?: (user: PublicUser) => void
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

function compareBy(a: PublicUser, b: PublicUser, key: SortKey): number {
  switch (key) {
    case 'displayName':
      return a.displayName.localeCompare(b.displayName)
    case 'email':
      return a.email.localeCompare(b.email)
    case 'role':
      return a.role.localeCompare(b.role)
    case 'isActive':
      return Number(b.isActive) - Number(a.isActive)
  }
}

export function UsersTable({ users, onEdit, onDeactivate }: UsersTableProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('displayName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    const out = [...users]
    out.sort((a, b) => {
      const cmp = compareBy(a, b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }, [users, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
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
            <TableHead><SortHeader label="Name" keyName="displayName" /></TableHead>
            <TableHead><SortHeader label="Email" keyName="email" /></TableHead>
            <TableHead>Phone</TableHead>
            <TableHead><SortHeader label="Role" keyName="role" /></TableHead>
            <TableHead><SortHeader label="Status" keyName="isActive" /></TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((user) => {
              const roleMeta = USER_ROLE_META[user.role]
              return (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {user.image && (
                          <AvatarImage src={user.image} alt={user.displayName} />
                        )}
                        <AvatarFallback className="text-xs">
                          {initials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {user.phoneE164}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${roleMeta.badgeClass}`}
                    >
                      {roleMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <IconDots className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          <IconExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(user)}>
                          <IconPencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {user.isActive && (
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDeactivate?.(user)}
                          >
                            <IconUserOff className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

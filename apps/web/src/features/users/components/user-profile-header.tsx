'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  IconArrowLeft,
  IconMail,
  IconPhone,
  IconCalendar,
  IconUsers,
  IconPencil,
  IconUserOff,
  IconUserCheck,
} from '@tabler/icons-react'
import { format } from 'date-fns'
import { USER_ROLE_META, type UserProfilePayload } from '../types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface UserProfileHeaderProps {
  user: UserProfilePayload['user']
  onEdit: () => void
  onDeactivate: () => void
  /** When true, disable the deactivate button — the admin is viewing themselves. */
  isSelf: boolean
}

export function UserProfileHeader({
  user,
  onEdit,
  onDeactivate,
  isSelf,
}: UserProfileHeaderProps) {
  const router = useRouter()
  const roleMeta = USER_ROLE_META[user.role]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {user.image && <AvatarImage src={user.image} alt={user.displayName} />}
              <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">
                  {user.displayName}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase ${roleMeta.badgeClass}`}
                >
                  {roleMeta.label}
                </Badge>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {user.team && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <IconUsers className="h-3.5 w-3.5" /> {user.team.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/users')}
              className="gap-2"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={onEdit} size="sm" className="gap-2">
              <IconPencil className="h-4 w-4" />
              Edit
            </Button>
            {user.isActive ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeactivate}
                disabled={isSelf}
                title={isSelf ? 'You cannot deactivate yourself' : undefined}
                className="gap-2 text-white"
              >
                <IconUserOff className="h-4 w-4" />
                Deactivate
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-2"
              >
                <IconUserCheck className="h-4 w-4" />
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 text-sm">
            <IconMail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <IconPhone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{user.phoneE164}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            <span>Joined {format(new Date(user.createdAt), 'd MMM yyyy')}</span>
          </div>
          {user.optedInAt && (
            <div className="flex items-center gap-2 text-sm">
              <IconCalendar className="h-4 w-4 text-muted-foreground" />
              <span>Opted in {format(new Date(user.optedInAt), 'd MMM yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

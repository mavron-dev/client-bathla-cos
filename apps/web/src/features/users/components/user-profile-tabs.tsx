'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserProfileHeader } from './user-profile-header'
import { EditUserDialog } from './edit-user-dialog'
import { DeactivateUserDialog } from './deactivate-user-dialog'
import type { PublicUser, UserProfilePayload } from '../types'

/**
 * Client wrapper that holds the header (with its dialog state) + the
 * tabbed body. Each tab's content is rendered server-side and passed in
 * as a child node — keeps the heavy work (queries, formatting) on the
 * server while the tabs themselves remain interactive.
 */
export function UserProfileTabs({
  profile,
  currentUserId,
  profileTab,
  activityTab,
  tasksTab,
  remindersTab,
}: {
  profile: UserProfilePayload
  currentUserId: string
  profileTab: React.ReactNode
  activityTab: React.ReactNode
  tasksTab: React.ReactNode
  remindersTab: React.ReactNode
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deactivateOpen, setDeactivateOpen] = React.useState(false)

  const refresh = React.useCallback(() => router.refresh(), [router])
  const onDeactivateSuccess = React.useCallback(
    () => router.push('/admin/users'),
    [router],
  )

  // The dialogs accept a PublicUser prop; UserProfilePayload.user has more
  // fields (team, optedInAt). Strip down to the dialog's expected shape.
  const publicUser: PublicUser = {
    id: profile.user.id,
    email: profile.user.email,
    phoneE164: profile.user.phoneE164,
    displayName: profile.user.displayName,
    image: profile.user.image,
    role: profile.user.role,
    teamId: profile.user.teamId,
    languagePref: profile.user.languagePref,
    timezone: profile.user.timezone,
    voiceReplyEnabled: profile.user.voiceReplyEnabled,
    isActive: profile.user.isActive,
  }

  return (
    <div className="flex flex-col gap-6">
      <UserProfileHeader
        user={profile.user}
        onEdit={() => setEditOpen(true)}
        onDeactivate={() => setDeactivateOpen(true)}
        isSelf={profile.user.id === currentUserId}
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          {profileTab}
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          {activityTab}
        </TabsContent>
        <TabsContent value="tasks" className="space-y-4">
          {tasksTab}
        </TabsContent>
        <TabsContent value="reminders" className="space-y-4">
          {remindersTab}
        </TabsContent>
      </Tabs>

      <EditUserDialog
        user={publicUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={refresh}
      />

      <DeactivateUserDialog
        user={publicUser}
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        onSuccess={onDeactivateSuccess}
      />
    </div>
  )
}

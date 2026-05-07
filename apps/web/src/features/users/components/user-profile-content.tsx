'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfileHeader } from './user-profile-header'
import { UserProfileKpis } from './user-profile-kpis'
import { UserProfilePrefs } from './user-profile-prefs'
import { UserProfileActivity } from './user-profile-activity'
import { EditUserDialog } from './edit-user-dialog'
import { DeactivateUserDialog } from './deactivate-user-dialog'
import type { UserProfilePayload, PublicUser } from '../types'

interface UserProfileContentProps {
  profile: UserProfilePayload
  /** The currently signed-in admin's user id, used to gate the self-deactivate guard. */
  currentUserId: string
}

export function UserProfileContent({
  profile,
  currentUserId,
}: UserProfileContentProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const onDeactivateSuccess = useCallback(() => {
    // After deactivation, kick back to the list.
    router.push('/admin/users')
  }, [router])

  // Strip the team relation off `user` to satisfy the EditUserDialog +
  // DeactivateUserDialog `PublicUser` prop type (they don't carry team).
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

      <UserProfileKpis kpis={profile.kpis} />

      <UserProfilePrefs user={profile.user} />

      <UserProfileActivity
        recentActivity={profile.recentActivity}
        recentSessions={profile.recentSessions}
      />

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

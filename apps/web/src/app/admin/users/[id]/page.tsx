import { notFound } from 'next/navigation'
import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import { ApiAuthError, sessionAuthContext } from '@/lib/api-auth'
import { getUserProfile } from '@/server/users/service'
import { getUserActivity, getReminderSchedules } from '@/lib/dashboard/users'
import { UserProfileTabs } from '@/features/users/components/user-profile-tabs'
import { UserProfileKpis } from '@/features/users/components/user-profile-kpis'
import { UserProfilePrefs } from '@/features/users/components/user-profile-prefs'
import { UserProfileActivity } from '@/features/users/components/user-profile-activity'
import { UserActivityTab } from '@/features/users/components/user-activity-tab'
import { UserTasksTab } from '@/features/users/components/user-tasks-tab'
import { UserRemindersTab } from '@/features/users/components/user-reminders-tab'

export const metadata = {
  title: 'User profile · Admin · Bathla COS',
}

export const dynamic = 'force-dynamic'

export default async function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireAdminOrDev()
  const ctx = sessionAuthContext(session)

  let profile
  try {
    profile = await getUserProfile(ctx, id)
  } catch (error) {
    if (error instanceof ApiAuthError && error.status === 404) {
      notFound()
    }
    throw error
  }

  // Fan out the per-tab data fetches in parallel — none of them gate the
  // overall page render, but a serial chain would block on each.
  const [activity, reminders] = await Promise.all([
    getUserActivity(id, 30),
    getReminderSchedules(id),
  ])

  // Profile tab content: existing KPIs + prefs + recent activity timeline.
  const profileTab = (
    <>
      <UserProfileKpis kpis={profile.kpis} />
      <UserProfilePrefs user={profile.user} />
      <UserProfileActivity
        recentActivity={profile.recentActivity}
        recentSessions={profile.recentSessions}
      />
    </>
  )

  return (
    <PageContainer scrollable>
      <UserProfileTabs
        profile={profile}
        currentUserId={session.user.id}
        profileTab={profileTab}
        activityTab={<UserActivityTab activity={activity} />}
        tasksTab={<UserTasksTab userId={id} />}
        remindersTab={<UserRemindersTab userId={id} initial={reminders} />}
      />
    </PageContainer>
  )
}

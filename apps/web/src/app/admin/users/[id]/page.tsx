import { notFound } from 'next/navigation'
import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import { ApiAuthError, sessionAuthContext } from '@/lib/api-auth'
import { getUserProfile } from '@/server/users/service'
import { UserProfileContent } from '@/features/users/components'

export const metadata = {
  title: 'User profile · Admin · Bathla COS',
}

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

  return (
    <PageContainer scrollable>
      <UserProfileContent profile={profile} currentUserId={session.user.id} />
    </PageContainer>
  )
}

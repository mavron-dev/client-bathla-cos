import { Metadata } from 'next'
import { Suspense } from 'react'
import SignInViewPage from '@/features/auth/components/sign-in-view'

export const metadata: Metadata = {
  title: 'Sign In | Bathla COS',
  description: 'Sign in to access your Bathla COS dashboard.',
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-purple-600 dark:border-zinc-800 dark:border-t-purple-500" />
        </div>
      }
    >
      <SignInViewPage />
    </Suspense>
  )
}

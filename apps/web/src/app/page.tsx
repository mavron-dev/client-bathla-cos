import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-8 dark:from-zinc-950 dark:to-zinc-900">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          B
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Bathla COS
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Internal Chief of Staff for Butler Homes — operations, reminders, and tasks in one place.
        </p>
        <Link href="/auth/sign-in" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
          Sign in to dashboard
        </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-600">Invite-only · Powered by Butler</p>
      </div>
    </main>
  )
}

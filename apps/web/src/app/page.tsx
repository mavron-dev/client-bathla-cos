import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--primary) 0%, transparent 50%)',
        }}
      />

      <div className="animate-fadeIn flex max-w-md flex-col items-center space-y-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
          B
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Bathla COS
          </h1>
          <p className="text-base text-muted-foreground">
            Internal Chief of Staff for Bathla Homes — operations, reminders, and tasks in one place.
          </p>
        </div>

        <Link
          href="/auth/sign-in"
          className={buttonVariants({
            size: 'lg',
            className: 'group gap-2 px-6',
          })}
        >
          Sign in to dashboard
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <p className="text-xs text-muted-foreground/70">
          Invite-only · Bathla COS
        </p>
      </div>
    </main>
  )
}

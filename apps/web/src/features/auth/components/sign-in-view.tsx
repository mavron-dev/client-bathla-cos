'use client'

import { signIn, useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Building2, MessageCircle } from 'lucide-react'

const slides = [
  {
    id: 1,
    bgClass: 'bg-gradient-to-br from-zinc-950 via-orange-950/40 to-zinc-950',
    title: 'Operations clarity',
    category: 'Mission',
    icon: <Sparkles className="w-5 h-5" />,
    quote:
      '"Bathla COS exists so the principals at Bathla Homes can spend their day on judgment, not on chasing the next thing on a list."',
    author: 'The Bathla COS premise',
  },
  {
    id: 2,
    bgClass: 'bg-gradient-to-br from-zinc-950 via-orange-900/30 to-zinc-950',
    title: 'Built for Bathla',
    category: 'Vision',
    icon: <Building2 className="w-5 h-5" />,
    quote:
      '"Real-estate ops touches dozens of people daily — leads, calls, paperwork, tenants. The agent learns the cadence; the dashboard keeps it accountable."',
    author: 'Phase-1 design note',
  },
  {
    id: 3,
    bgClass: 'bg-gradient-to-br from-zinc-950 via-amber-900/30 to-zinc-950',
    title: 'WhatsApp-native',
    category: 'Promise',
    icon: <MessageCircle className="w-5 h-5" />,
    quote:
      '"You can run the business from a thumb. Voice in, decisions out — the dashboard is just for the moments you want the wider view."',
    author: 'Product principle',
  },
]

export default function SignInViewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = session.user.role
      if (callbackUrl && callbackUrl !== '/') {
        router.push(callbackUrl)
      } else if (role === 'admin' || role === 'developer') {
        router.push('/admin')
      } else {
        router.push('/executive')
      }
    }
  }, [session, status, callbackUrl, router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    await signIn('google', { callbackUrl })
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-zinc-950 text-white lg:flex overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={slides[currentSlide].id}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1.0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className={`absolute inset-0 z-0 ${slides[currentSlide].bgClass}`}
          />
        </AnimatePresence>

        <div
          className="pointer-events-none absolute inset-0 z-[5] opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, var(--primary) 0%, transparent 40%)',
          }}
        />

        <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="relative z-20 flex items-center gap-3 p-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/30">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Bathla COS
          </span>
        </div>

        <div className="relative z-20 mt-auto p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={slides[currentSlide].id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                {slides[currentSlide].icon}
                <span>{slides[currentSlide].category}</span>
              </div>

              <h2 className="text-4xl font-bold tracking-tighter text-white">
                {slides[currentSlide].title}
              </h2>

              <blockquote className="border-l-2 border-[var(--primary)] pl-4">
                <p className="text-lg font-light text-zinc-300 italic">
                  {slides[currentSlide].quote}
                </p>
                <footer className="mt-2 text-sm font-semibold text-white">
                  — {slides[currentSlide].author}
                </footer>
              </blockquote>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === currentSlide
                    ? 'w-8 bg-[var(--primary)]'
                    : 'w-2 bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-full items-center justify-center bg-background p-4 lg:p-8">
        <div className="animate-fadeIn flex w-full max-w-md flex-col items-center justify-center space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
              B
            </div>
            <span className="text-2xl font-semibold text-foreground">
              Bathla COS
            </span>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">
                {error === 'AccessDenied'
                  ? 'Access denied. Your email is not in the invite list.'
                  : 'An error occurred during sign in.'}
              </p>
            </div>
          )}

          <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-8 shadow-lg backdrop-blur-sm">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Invite only
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
              <p className="text-xs text-foreground/80">
                This is an invite-only platform. Only authorized email addresses can sign in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

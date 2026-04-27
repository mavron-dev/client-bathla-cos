import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

/**
 * Route protection at the Edge.
 * Uses the edge-safe `authConfig` (no Prisma) — the `authorized` callback
 * inside it decides who can see what.
 */
const { auth } = NextAuth(authConfig)

export const middleware = auth

export const config = {
  matcher: [
    // Run on every route except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

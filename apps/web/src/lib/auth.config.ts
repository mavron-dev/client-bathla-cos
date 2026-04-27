import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

/**
 * Edge-compatible NextAuth config.
 * NO Prisma imports here — this file is consumed by middleware (Edge Runtime).
 * Server-side callbacks that need DB access live in `auth.ts`.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/sign-in',
  },

  callbacks: {
    /**
     * JWT pass-through. The actual role/teamId/image are populated by
     * the server-side `jwt` callback in `auth.ts`. Here we just preserve.
     */
    jwt({ token }) {
      return token
    },

    /**
     * Expose role + teamId + image on the session object for client + server consumers.
     */
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as typeof session.user.role
        session.user.teamId = token.teamId as string | null | undefined
      }
      return session
    },

    /**
     * Edge middleware route protection.
     * Bathla COS role → route mapping (provisional 5→2 collapse):
     *   developer + admin       → /admin
     *   director + manager + member → /executive
     * admin and developer have universal access — they can also visit /executive.
     */
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = request.nextUrl

      // Always allow NextAuth's own API routes
      if (pathname.startsWith('/api/auth')) return true

      // Logged-in user on landing or sign-in → redirect to role dashboard
      if (isLoggedIn && (pathname === '/' || pathname === '/auth/sign-in')) {
        const role = auth?.user?.role
        if (role === 'admin' || role === 'developer') {
          return Response.redirect(new URL('/admin', request.nextUrl.origin))
        }
        return Response.redirect(new URL('/executive', request.nextUrl.origin))
      }

      // Unauthed users may see landing + sign-in
      if (pathname === '/' || pathname === '/auth/sign-in') return true

      // Everything else is gated
      if (!isLoggedIn) return false

      const userRole = auth?.user?.role

      // admin + developer: universal access
      if (userRole === 'admin' || userRole === 'developer') return true

      // Non-admin/dev users can't reach /admin
      if (pathname.startsWith('/admin')) {
        return Response.redirect(new URL('/executive', request.nextUrl.origin))
      }

      return true
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  trustHost: true,
}

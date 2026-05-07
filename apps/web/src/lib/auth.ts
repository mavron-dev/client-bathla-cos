import NextAuth from 'next-auth'
import { prisma } from './prisma'
import { authConfig } from './auth.config'

/**
 * Full NextAuth setup: edge-safe config from auth.config + server-side
 * callbacks that need Prisma. Imported by middleware ONLY for the auth helper
 * (which uses authConfig); the route handler imports `handlers` from here.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  callbacks: {
    ...authConfig.callbacks,

    /**
     * Invite-only gate.
     *  1. Reject anything that isn't Google.
     *  2. Look up the user by email — reject if not pre-created (invite-only).
     *  3. Reject inactive users.
     *  4. Sync Google profile (displayName + image) on every sign-in.
     */
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false

      const email = user.email
      if (!email) return false

      const dbUser = await prisma.user.findUnique({ where: { email } })

      if (!dbUser) {
        console.log(`[AUTH] Login rejected: ${email} not in invite list`)
        return false
      }

      if (!dbUser.isActive) {
        console.log(`[AUTH] Login rejected: ${email} is inactive`)
        return false
      }

      await prisma.user.update({
        where: { email },
        data: {
          displayName: user.name ?? dbUser.displayName,
          image: user.image ?? dbUser.image,
        },
      })

      console.log(`[AUTH] Login successful: ${email} (role: ${dbUser.role})`)
      return true
    },

    /**
     * Populate the JWT with id / role / teamId / picture on sign-in.
     * Subsequent calls reuse the cached token until the session expires.
     */
    async jwt({ token, trigger }) {
      if (trigger === 'signIn' || !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.teamId = dbUser.teamId
          if (dbUser.image) token.picture = dbUser.image
        }
      }
      return token
    },

    /**
     * Mirror token fields onto the session.user for client consumers.
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as typeof session.user.role
        session.user.teamId = token.teamId as string | null | undefined
        if (token.picture) session.user.image = token.picture
      }
      return session
    },
  },
})

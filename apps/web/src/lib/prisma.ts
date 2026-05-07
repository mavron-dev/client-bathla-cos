// Re-export the singleton from the workspace database package so files in
// apps/web can write `import { prisma } from "./prisma"` (matching the
// inspiration's pattern) without having to know about the workspace name.
export { prisma } from '@bathla-cos/database'

/**
 * Retry wrapper for database operations.
 * Retries on transient Prisma connection errors with exponential backoff.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error
      const e = error as { code?: string; message?: string }
      const isConnectionError =
        e?.code === 'P1001' || // Can't reach database server
        e?.code === 'P1002' || // Connection timed out
        e?.code === 'P1008' || // Operations timed out
        e?.code === 'P1017' || // Server closed connection
        (typeof e?.message === 'string' && e.message.includes("Can't reach database"))

      if (!isConnectionError || attempt === maxRetries - 1) throw error

      const delay = baseDelay * 2 ** attempt
      console.warn(
        `[db] connection failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`,
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@bathla-cos/database'],
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
}

export default nextConfig

import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
  transpilePackages: ['@bathla-cos/database'],
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
}

export default nextConfig

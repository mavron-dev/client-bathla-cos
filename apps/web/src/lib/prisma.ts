// Re-export the singleton from the workspace database package so files in
// apps/web can write `import { prisma } from "./prisma"` (matching the
// inspiration's pattern) without having to know about the workspace name.
export { prisma } from '@bathla-cos/database'

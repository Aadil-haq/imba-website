import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

function createPrismaClient() {
  let url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (url.startsWith('libsql://')) url = url.replace('libsql://', 'https://')

  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter } as any)
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient()))

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
export function createPrisma(pool) {
  return new PrismaClient({ adapter: new PrismaPg(pool, { schema: 'app_private', disposeExternalPool: false }) })
}

import { loadEnvFile } from 'node:process'
import { randomBytes, randomUUID } from 'node:crypto'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { hashToken } from '../src/modules/identity-access/membership.js'
loadEnvFile(new URL('../.env', import.meta.url))
const pool = createDatabasePool(), prisma = createPrisma(pool)
const rollback = new Error('EXPECTED_ROLLBACK')
try {
  const counts = { roles: await prisma.role.count(), permissions: await prisma.permission.count(), profiles: await prisma.userProfile.count() }
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082026)`
    const invite = await tx.invitation.create({ data: { email: `${randomUUID()}@example.invalid`, displayName: 'Transaction validation', tokenHash: hashToken(randomBytes(32).toString('hex')), expiresAt: new Date(Date.now()+10000), roles: { create: { roleCode: 'GUIDE', scope: 'SELF' } } }, include: { roles: { include: { role: { include: { permissions: true } } } } } })
    if (invite.roles[0].role.permissions[0].permissionCode !== 'profile.read') throw new Error('ROLE_RELATION_FAILED')
    throw rollback
  }).catch(error => { if (error !== rollback) throw error })
  console.log(JSON.stringify({ database: 'UP', prisma: 'UP', counts, invitationTransaction: 'PASS_ROLLED_BACK' }))
} catch { console.error('IDENTITY_CHECK_FAILED'); process.exitCode = 1 }
finally { await prisma.$disconnect(); await pool.end() }

import { loadEnvFile } from 'node:process'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { hashToken, normalizeEmail } from '../src/modules/identity-access/membership.js'
loadEnvFile(new URL('../.env', import.meta.url))
const pool = createDatabasePool(), prisma = createPrisma(pool)
try {
  const email = normalizeEmail(process.argv[2])
  const displayName = process.argv[3]?.trim()
  if (!displayName || displayName.length > 100) throw new Error('DISPLAY_NAME_REQUIRED')
  const code = randomBytes(32).toString('hex')
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082026)`
    const assigned = await tx.userRole.count({ where: { roleCode: 'ADMIN_MANAGER' } })
    const pending = await tx.invitation.count({ where: { consumedAt: null, expiresAt: { gt: new Date() }, roles: { some: { roleCode: 'ADMIN_MANAGER' } } } })
    if (assigned || pending) throw new Error('OWNER_ALREADY_CONFIGURED')
    const invitation = await tx.invitation.create({ data: { email, displayName, tokenHash: hashToken(code), expiresAt: new Date(Date.now() + 72 * 3600000), roles: { create: { roleCode: 'ADMIN_MANAGER', scope: 'COMPANY' } } } })
    await tx.auditEvent.create({ data: { action: 'owner.invitation.created', targetId: invitation.id, details: { source: 'local-bootstrap' } } })
  const directory = new URL('../bootstrap.local/', import.meta.url)
  await mkdir(directory, { recursive: true })
  await writeFile(new URL('owner-invitation.txt', directory), `Open http://localhost:5174/accept-invitation#invitation=${code}\nEmail: ${email}\nExpires in 72 hours. Keep this file private; delete it after activation.\n`, { mode: 0o600 })

  })
  console.log('OWNER_INVITATION_READY: backend/bootstrap.local/owner-invitation.txt. No password has been created.')
} catch (error) {
  console.error(['OWNER_ALREADY_CONFIGURED','DISPLAY_NAME_REQUIRED','INVALID_EMAIL'].includes(error.message) ? error.message : 'BOOTSTRAP_FAILED')
  process.exitCode = 1
} finally { await prisma.$disconnect(); await pool.end() }

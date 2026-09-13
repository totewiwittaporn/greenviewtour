// Non-login staff fixture for the existing demo fleet. Default is rollback.
import assert from 'node:assert/strict'
import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { profileInclude } from '../src/modules/identity-access/policy.js'
import { managementScope } from '../src/modules/identity-access/user-management.js'
loadEnvFile(new URL('../.env', import.meta.url))
assert.equal(process.env.APP_ENV, 'preview')
assert.equal(process.env.SUPABASE_PROJECT_REF, 'qplzgpyidszxbtbyknjc')
const id = 'a2379779-26bd-43c7-9cce-c10f45b7d691', name = 'DEMO FLOW · คนขับรถ ก'
const email = 'demo-flow-driver-a@example.invalid'
const pool = createDatabasePool(), prisma = createPrisma(pool), rollback = Error('ROLLBACK')
let result
try {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const existing = await tx.userProfile.findUnique({ where: { id }, include: { roles: true } })
    if (existing) {
      assert.equal(existing.displayName, name)
      assert.equal(existing.status, 'ACTIVE')
      assert.ok(existing.roles.some(r => r.roleCode === 'DRIVER' && r.scope === 'SELF'))
      const [identity] = await tx.$queryRaw`SELECT (email = ${email} AND banned_until = 'infinity'::timestamptz AND COALESCE(encrypted_password, '') = '' AND email_confirmed_at IS NULL AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) AS non_login FROM auth.users u WHERE id = ${id}::uuid`
      assert.equal(identity?.non_login, true, 'Demo identity changed; review without overwriting')
      result = 'ALREADY_PRESENT'
      return
    }
    const actor = (await tx.userProfile.findMany({ where: { status: 'ACTIVE' }, include: profileInclude })).find(p => managementScope(p)?.company)
    assert.ok(actor, 'Active manager required')
    // The profile FK needs an auth row. This fixture has no credentials, identity,
    // confirmation or invitation and is permanently banned from authentication.
    await tx.$executeRaw`INSERT INTO auth.users (id, aud, role, email, banned_until) VALUES (${id}::uuid, 'authenticated', 'authenticated', ${email}, 'infinity'::timestamptz)`
    await tx.userProfile.create({ data: { id, displayName: name, department: 'DRIVER', status: 'ACTIVE', roles: { create: { roleCode: 'DRIVER', scope: 'SELF' } } } })
    await tx.auditEvent.create({ data: { actorId: actor.id, targetId: id, action: 'demo.driver.created', details: { name, nonLogin: true, purpose: 'Local workflow testing' } } })
    result = process.argv.includes('--apply') ? 'CREATED' : 'VALIDATED_ROLLBACK'
    if (!process.argv.includes('--apply')) throw rollback
  }, { timeout: 30000 })
} catch (error) { if (error !== rollback) throw error }
finally { await prisma.$disconnect(); await pool.end() }
console.log(JSON.stringify({ result, id, name, nonLogin: true }))

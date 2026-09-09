import { randomUUID } from 'node:crypto'
import { authorize, dateOnly, fail, hash, write } from './common.js'

// This module prepares durable, reviewable work only. It never sends a LINE message.
export function bangkokSchedule(now = new Date()) {
  if (!Number.isFinite(+now)) throw new Error('INVALID_DATE')
  const local = new Date(+now + 7 * 60 * 60 * 1000)
  const hour = local.getUTCHours(), minute = local.getUTCMinutes()
  const serviceDate = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1)).toISOString().slice(0, 10)
  return { serviceDate, closeDue: hour >= 22, summaryDue: hour > 22 || (hour === 22 && minute >= 30), timezone: 'Asia/Bangkok' }
}

export function notificationReadiness(env = process.env) {
  let baseUrl = null
  try {
    const url = new URL(env.OPERATIONS_PUBLIC_BASE_URL || '')
    const host = url.hostname.toLowerCase()
    if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && !host.includes(':') && !/^\d+(\.\d+){3}$/.test(host) && host.includes('.') && !host.endsWith('.local') && !host.endsWith('.localhost') && !host.endsWith('.internal')) baseUrl = url.origin
  } catch { /* Configuration is intentionally optional in Local. */ }
  const missing = []
  if (!baseUrl) missing.push('OPERATIONS_PUBLIC_BASE_URL')
  if (!env.LINE_CHANNEL_ACCESS_TOKEN?.trim()) missing.push('LINE_CHANNEL_ACCESS_TOKEN')
  if (!/^C[0-9a-f]{32}$/i.test(env.LINE_GROUP_ID || '')) missing.push('LINE_GROUP_ID')
  return { status: missing.length ? 'NOT_CONFIGURED' : 'PREPARATION_READY', missing, baseUrl, schedulerEnabled: false, deliveryEnabled: false, note: 'Preparation only. Automatic closing and LINE delivery are not enabled.' }
}

export function normalizeRuns(runs) {
  if (!Array.isArray(runs)) fail('INVALID_INPUT', 400)
  const seen = new Set()
  return runs.map(run => {
    if (!['BOAT', 'VEHICLE'].includes(run.kind) || !/^[0-9a-f-]{36}$/i.test(run.id) || typeof run.name !== 'string' || !run.name.trim() || run.name.length > 200 || [...run.name].some(c=>c.charCodeAt(0)<32)) fail('INVALID_INPUT', 400)
    if (![run.adults, run.children].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000)) fail('INVALID_QUANTITY', 400)
    if (seen.has(run.id)) fail('INVALID_INPUT', 400)
    seen.add(run.id)
    // Explicit allowlist: never copy guest, agent, hotel, payment or special-request fields.
    if (run.direction && !['OUTBOUND','RETURN'].includes(run.direction)) fail('INVALID_INPUT',400)
    if (run.version !== undefined && (!Number.isSafeInteger(run.version) || run.version < 1)) fail('INVALID_INPUT',400)
    return { kind: run.kind, id: run.id, name: run.name.trim(), direction:run.direction || null, version:run.version || 1, adults: run.adults, children: run.children, passengers: run.adults + run.children }
  }).sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
}

export function summaryMessages(serviceDate, runs, baseUrl, revision = 1) {
  dateOnly(serviceDate)
  const readiness = notificationReadiness({ OPERATIONS_PUBLIC_BASE_URL: baseUrl })
  if (!readiness.baseUrl) fail('PUBLIC_URL_REQUIRED', 409)
  const lines = normalizeRuns(runs).map(run => `${run.kind === 'BOAT' ? 'Boat' : 'Vehicle'} ${run.name}${run.direction ? ` (${run.direction})` : ''}: ${run.passengers} passengers\n${readiness.baseUrl}/operations/${run.kind === 'BOAT' ? 'guide' : 'driver'}?runId=${run.id}&date=${serviceDate}`)
  let current = `Job Order ${serviceDate} — revision ${revision}\nAllocated runs only; assignment completeness requires review.`, texts = []
  for (const line of lines) {
    if ((current + '\n\n' + line).length > 4900) { texts.push(current); current = `Job Order ${serviceDate} (continued)` }
    current += '\n\n' + line
  }
  if (!lines.length) current += '\nNo assigned runs.'
  texts.push(current)
  // LINE push supports up to five messages. Refuse silent omission of later runs.
  if (texts.length > 5) fail('SUMMARY_TOO_LARGE', 409)
  return texts.map(text => ({ type: 'text', text }))
}

export async function dailySummaryState(prisma, actorId, serviceDate, env = process.env, page = 1) {
  dateOnly(serviceDate)
  if (!Number.isSafeInteger(page) || page < 1) fail('INVALID_INPUT',400)
  await authorize(prisma, actorId)
  const total = await prisma.operationDailySnapshot.count({ where: { serviceDate: dateOnly(serviceDate) } })
  page = Math.min(page,Math.max(1,Math.ceil(total / 25)))
  const snapshots = await prisma.operationDailySnapshot.findMany({ where: { serviceDate: dateOnly(serviceDate) }, orderBy: [{ kind: 'asc' }, { revision: 'desc' }], take: 25, skip: (page - 1) * 25 })
  const outbox = await prisma.operationNotificationOutbox.findMany({ where: { serviceDate: dateOnly(serviceDate) }, orderBy: { createdAt: 'desc' }, take:25, select: { id: true, snapshotId: true, status: true, createdAt: true, revision: true } })
  return { serviceDate, readiness: notificationReadiness(env), snapshots, outbox, page, pageSize:25, total, assignmentCoverage: 'NOT_VERIFIED' }
}

// loadRuns(tx, serviceDate) must read only confirmed, allocated jobs in the same transaction.
export function prepareDailySummary(prisma, actorId, input, loadRuns = loadDailyRuns, env = process.env, { once = false } = {}) {
  if (!input || !['CLOSE', 'SUMMARY'].includes(input.kind)) fail('INVALID_INPUT', 400)
  const serviceDate = dateOnly(input.serviceDate)
  return write(prisma, actorId, async tx => {
    const last = await tx.operationDailySnapshot.findFirst({ where: { serviceDate, kind: input.kind }, orderBy: { revision: 'desc' } })
    if (once && last) return {snapshot:last,outbox:null,readiness:notificationReadiness(env),bookingsLocked:false}
    const runs = normalizeRuns(await loadRuns(tx, input.serviceDate))
    const contentHash = hash(runs)
    const snapshot = last?.contentHash === contentHash ? last : await tx.operationDailySnapshot.create({ data: { id: randomUUID(), serviceDate, kind: input.kind, revision: (last?.revision || 0) + 1, contentHash, runs, actorId } })
    const readiness = notificationReadiness(env)
    let outbox = null
    if (input.kind === 'SUMMARY' && readiness.status === 'PREPARATION_READY') {
      outbox = await tx.operationNotificationOutbox.findUnique({ where: { snapshotId: snapshot.id } })
      if (!outbox) {
        if (await tx.operationNotificationOutbox.count({where:{serviceDate,status:'SENDING'}})) fail('LINE_DELIVERY_BUSY',409)
        await tx.operationNotificationOutbox.updateMany({where:{serviceDate,status:{in:['PREPARED','FAILED']}},data:{status:'SUPERSEDED'}})
        outbox = await tx.operationNotificationOutbox.create({ data: { id: randomUUID(), snapshotId: snapshot.id, serviceDate, revision: snapshot.revision, status: 'PREPARED', retryKey: randomUUID(), payload: { to: env.LINE_GROUP_ID, messages: summaryMessages(input.serviceDate, runs, readiness.baseUrl, snapshot.revision) } } })
      }
    }
    return { snapshot, outbox: outbox ? { id: outbox.id, status: outbox.status, revision: outbox.revision } : null, readiness, bookingsLocked: false }
  })
}

export async function loadDailyRuns(tx, serviceDate) {
  dateOnly(serviceDate)
  const start = new Date(`${serviceDate}T00:00:00+07:00`), end = new Date(+start + 86400000)
  const runs = await tx.dispatchRun.findMany({ where: { status:'OPEN', slot: { status:'ACTIVE', startsAt: { gte: start, lt: end } } }, include: { assignments: { where: { bookingLine: { booking: { status: { in: ['CONFIRMED','COMPLETED'] } } } }, select: { adults:true, children:true } } } })
  return runs.map(run => ({ id:run.id, kind:run.kind, name:run.name, direction:run.direction, version:run.version, adults:run.assignments.reduce((n,a)=>n+a.adults,0), children:run.assignments.reduce((n,a)=>n+a.children,0) }))
}

// Explicit runner entrypoint only: never registered in the HTTP server or local dev startup.
export async function runNightlyTick(prisma, actorId, { now = new Date(), env = process.env } = {}) {
  const schedule = bangkokSchedule(now)
  const results = []
  for (const kind of [...(schedule.closeDue ? ['CLOSE'] : []), ...(schedule.summaryDue ? ['SUMMARY'] : [])]) {
    results.push(await prepareDailySummary(prisma, actorId, {serviceDate:schedule.serviceDate,kind},loadDailyRuns,env,{once:true}))
  }
  return { schedule, results }
}

export async function deliverPrepared(prisma, actorId, id, { enabled = false, env = process.env, now = new Date(), transport = fetch } = {}) {
  if (!enabled || env.OPERATIONS_LINE_DELIVERY_ENABLED !== 'true') fail('LINE_DELIVERY_DISABLED',409)
  if (notificationReadiness(env).status !== 'PREPARATION_READY') fail('LINE_NOT_CONFIGURED',409)
  const row = await write(prisma,actorId,async tx => {
    const item = await tx.operationNotificationOutbox.findUnique({where:{id}})
    if (!item) fail('RELATED_RECORD_UNAVAILABLE',404)
    if (['SENT','EXPIRED','SUPERSEDED'].includes(item.status)) return item
    if (item.firstAttemptAt && +now - +item.firstAttemptAt >= 24*3600000) return tx.operationNotificationOutbox.update({where:{id},data:{status:'EXPIRED'}})
    if (item.attempts >= 5) fail('LINE_ATTEMPTS_EXHAUSTED',409)
    if (item.status === 'SENDING' && +now - +item.lastAttemptAt < 120000) fail('LINE_DELIVERY_BUSY',409)
    if (item.payload.to !== env.LINE_GROUP_ID) fail('LINE_CONFIG_CHANGED',409)
    return tx.operationNotificationOutbox.update({where:{id},data:{status:'SENDING',attempts:{increment:1},firstAttemptAt:item.firstAttemptAt || now,lastAttemptAt:now}})
  })
  if (['SENT','EXPIRED','SUPERSEDED'].includes(row.status)) return {id,status:row.status}
  let status = 'FAILED', requestId = null
  try {
    const response = await transport('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,'Content-Type':'application/json','X-Line-Retry-Key':row.retryKey},body:JSON.stringify(row.payload),signal:AbortSignal.timeout(15000)})
    requestId = response.headers.get('x-line-accepted-request-id')
    if (response.ok || (response.status === 409 && requestId)) status = 'SENT'
  } catch { /* Keep immutable payload/retry key for a bounded retry, including unknown network outcomes. */ }
  await write(prisma,actorId,tx => tx.operationNotificationOutbox.updateMany({where:{id,status:'SENDING',attempts:row.attempts},data:{status}}))
  return {id,status}
}

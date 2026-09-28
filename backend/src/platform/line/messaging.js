import { createHmac, timingSafeEqual } from 'node:crypto'

export function validatePush(payload, retryKey) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(retryKey || '')) throw new Error('LINE_INVALID_RETRY_KEY')
  if (!payload || !/^[UCR][0-9a-f]{32}$/i.test(payload.to || '') || Object.keys(payload).some(key => !['to', 'messages'].includes(key))) throw new Error('LINE_INVALID_RECIPIENT')
  if (!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 5) throw new Error('LINE_INVALID_MESSAGES')
  for (const message of payload.messages) {
    if (!message || message.type !== 'text' || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 5000 || Object.keys(message).some(key => !['type', 'text'].includes(key))) throw new Error('LINE_INVALID_MESSAGES')
  }
}

export async function pushText({ payload, retryKey, token, mode = 'simulation', transport = fetch }) {
  validatePush(payload, retryKey)
  if (mode === 'simulation') return { status: 'SIMULATED', messageCount: payload.messages.length, accepted: false }
  if (mode !== 'live' || typeof token !== 'string' || !token.trim()) throw new Error('LINE_NOT_CONFIGURED')
  try {
    const response = await transport('https://api.line.me/v2/bot/message/push', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Line-Retry-Key': retryKey },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15000), redirect: 'error',
    })
    const accepted = response.ok || (response.status === 409 && Boolean(response.headers.get('x-line-accepted-request-id')))
    // Acceptance does not prove receipt or reading by a person.
    return { status: accepted ? 'ACCEPTED' : 'FAILED', accepted, retryable: !accepted && response.status >= 500 }
  } catch {
    return { status: 'FAILED', accepted: false, retryable: true }
  }
}

// Future HTTPS webhook entrypoints must verify raw bytes before parsing JSON.
// Verification alone never links accounts, grants roles, saves messages or replies.
export function verifyWebhook(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length > 1024 * 1024 || typeof secret !== 'string' || !secret || typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const received = Buffer.from(signature, 'base64')
  return received.length === expected.length && timingSafeEqual(expected, received)
}

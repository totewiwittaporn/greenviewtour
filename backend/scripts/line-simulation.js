// Standalone synthetic fixture: no environment files, database or real network.
import { pushText } from '../src/platform/line/messaging.js'
import { summaryMessages } from '../src/modules/operations/notifications.js'
if (process.argv.length > 2) throw new Error('Simulation accepts no arguments; live delivery uses the separate reviewed runner.')
const messages = summaryMessages('2026-09-16', [{ id: '11111111-1111-4111-8111-111111111111', kind: 'BOAT', name: 'DEMO boat', adults: 10, children: 2 }], 'https://example.com')
const result = await pushText({ payload: { to: 'C' + '0'.repeat(32), messages }, retryKey: '11111111-1111-4111-8111-111111111111', transport: () => { throw new Error('Network forbidden in simulation') } })
console.log(JSON.stringify({ ...result, notice: 'DEMO ONLY — nothing sent or saved', messages }, null, 2))

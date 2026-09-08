// Isolated UI verification: no database, Supabase client, credentials or outgoing email.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
const root = fileURLToPath(new URL('../frontend/backoffice/', import.meta.url))
const api = createServer((_req, response) => {
  response.writeHead(401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify({ code: 'LOGIN_REQUIRED' }))
})
let vite
try {
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(5000, '127.0.0.1', resolve) })
  vite = await createViteServer({ root, configFile: `${root}vite.config.js` })
  await vite.listen()
  for (const name of ['smoke-auth.js', 'smoke-staff-invitations.js']) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(new URL(name, import.meta.url))], { stdio: 'inherit' })
      child.once('error', reject)
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${name} failed`)))
    })
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { await vite?.close(); if (api.listening) await new Promise(resolve => api.close(resolve)) }

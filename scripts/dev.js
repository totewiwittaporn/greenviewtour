import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const apiPort = process.platform === 'darwin' ? 5001 : 5000
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue
    child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 1500).unref()
}
function launch(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' })
  children.push(child)
  child.on('error', () => { console.error('Could not start a service. Run npm ci first.'); stop(1) })
  child.on('exit', code => { if (!stopping) { console.error('A local service stopped; closing the others.'); stop(code || 1) } })
}
async function portAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () => reject(new Error(`Port ${port} is already in use. Close the previous launcher first.`)))
    server.listen(port, '127.0.0.1', () => server.close(resolve))
  })
}
async function waitFor(url, name) {
  for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return
    } catch { /* startup is still in progress */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`${name} did not become ready.`)
}
try {
  if (process.env.NODE_ENV === 'production') throw new Error('This launcher is for local development only.')
  for (const port of [apiPort, 5173, 5174]) await portAvailable(port)
  const env = { ...process.env, LOCAL_API_PORT: String(apiPort), LOCAL_API_TOKEN: randomBytes(32).toString('hex') }
  launch(['backend/src/app/server.js'], root, env)
  launch([vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], `${root}/frontend/public-web`, env)
  launch([vite, '--host', '127.0.0.1', '--port', '5174', '--strictPort'], `${root}/frontend/backoffice`, env)
  await Promise.all([
    waitFor(`http://127.0.0.1:${apiPort}/health/live`, 'Backend'),
    waitFor('http://127.0.0.1:5173', 'Public web'),
    waitFor('http://127.0.0.1:5174', 'Backoffice'),
  ])
  console.log(`\nREADY\nPublic: http://localhost:5173\nUsers: http://localhost:5174/settings/users\nAPI: http://127.0.0.1:${apiPort}/health/live\nPress Ctrl+C to stop all three services.\n`)
  if (process.argv.includes('--open') && process.platform === 'win32') {
    const opener = spawn('powershell.exe', ['-NoProfile', '-Command', "Start-Process 'http://localhost:5173'; Start-Process 'http://localhost:5174/settings/users'"], { stdio: 'ignore' })
    opener.on('error', () => console.log('Open the URLs above in your browser.'))
  }
} catch (error) { console.error(error.message); stop(1) }
process.once('SIGINT', () => stop())
process.once('SIGTERM', () => stop())

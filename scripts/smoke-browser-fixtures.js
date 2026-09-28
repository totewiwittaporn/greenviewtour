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
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(0, '127.0.0.1', resolve) })
  process.env.LOCAL_API_PORT = String(api.address().port)
  process.env.GREENVIEW_TEST_ORIGIN = 'http://localhost:5274'
  vite = await createViteServer({ root, server:{port:5274}, configFile: `${root}vite.config.js` })
  await vite.listen()
  for (const name of ['smoke-shell-scroll.js', 'smoke-data-fetch.js', 'smoke-customers.js', 'smoke-workspace-startup.js', 'smoke-auth.js', 'smoke-staff-invitations.js', 'smoke-user-access.js', 'smoke-portrait-job.js', 'smoke-dashboard.js', 'smoke-reference-dashboard.js', 'smoke-shell-geometry.js', 'smoke-booking-access.js', 'smoke-booking-commission.js', 'smoke-locale-backoffice.js', 'smoke-navigation-ui.js', 'smoke-capacity-ui.js', 'smoke-backoffice-finance.js']) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(new URL(name, import.meta.url))], { stdio: 'inherit' })
      child.once('error', reject)
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${name} failed`)))
    })
  }
  for (const [app, port, env, script] of [
    ['public-web', 5273, 'GREENVIEW_PUBLIC_ORIGIN', 'smoke-public-locale.js'],
    ['member', 5275, 'GREENVIEW_MEMBER_ORIGIN', 'smoke-member-locale.js'],
  ]) {
    const appRoot = fileURLToPath(new URL(`../frontend/${app}/`, import.meta.url))
    const appVite = await createViteServer({root:appRoot, server:{port,strictPort:true}, configFile:`${appRoot}vite.config.js`})
    try {
      await appVite.listen()
      for(const testScript of [script,'smoke-commerce-data-fetch.js',...(app==='public-web'?['smoke-public-content.js']:[])])await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(new URL(testScript, import.meta.url))], {stdio:'inherit',env:{...process.env,[env]:`http://localhost:${port}`,GREENVIEW_COMMERCE_SURFACE:app}})
        child.once('error',reject)
        child.once('exit',code=>code===0?resolve():reject(new Error(`${testScript} failed`)))
      })
    } finally { await appVite.close() }
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { await vite?.close(); if (api.listening) await new Promise(resolve => api.close(resolve)) }

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', port: 5174, strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (outgoing, incoming) => {
            // Only this local origin can use the development proxy. No credential reaches the browser.
            const origin = incoming.headers.origin
            const site = incoming.headers['sec-fetch-site']
            const allowed = (!origin || ['http://localhost:5174', 'http://127.0.0.1:5174'].includes(origin)) && site !== 'cross-site'
            outgoing.removeHeader('x-greenview-local-token')
            if (allowed && process.env.LOCAL_API_TOKEN) outgoing.setHeader('x-greenview-local-token', process.env.LOCAL_API_TOKEN)
          })
        },
      },
    },
  },
})

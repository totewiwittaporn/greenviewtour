import {commerceProxy,commerceWatch} from '../../packages/config/local-commerce-proxy.js'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{host:'127.0.0.1',port:5173,strictPort:true,watch:commerceWatch,proxy:commerceProxy(5173,['/api/public/'])},
})

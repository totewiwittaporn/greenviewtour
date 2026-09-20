import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {commerceProxy,commerceWatch} from '../../packages/config/local-commerce-proxy.js'
export default defineConfig({plugins:[react()],server:{host:'127.0.0.1',port:5175,strictPort:true,watch:commerceWatch,proxy:commerceProxy(5175,['/api/public/','/api/member/'])}})

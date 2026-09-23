import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { host: '0.0.0.0', port: 5173, proxy: { '/api': { target: 'http://php:8000', changeOrigin: true, timeout: 240000, proxyTimeout: 240000 } } },
  plugins: [react()],
})

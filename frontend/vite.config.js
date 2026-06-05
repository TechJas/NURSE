import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward all API calls to FastAPI backend on port 8000
      '/auth':          { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/nurses':        { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/documents':     { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/admin':         { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/notifications':  { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/hospital-admin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/dept':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})

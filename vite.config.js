import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/fotos': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/laboratorios': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/turnoLlamado': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/upload-foto': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  }
})

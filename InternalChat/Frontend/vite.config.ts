import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3054,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3055',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3055',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3055',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

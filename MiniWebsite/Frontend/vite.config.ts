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
    proxy: {
      '/uploads': {
        target: 'http://localhost:3055',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 6127,
    host: '0.0.0.0',
    // Required when nginx proxies website.shuleplus.rw → vite preview
    allowedHosts: ['website.shuleplus.rw', 'localhost', '127.0.0.1'],
  },
})

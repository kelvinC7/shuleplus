import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3004,
    proxy: {
      '/uploads': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})

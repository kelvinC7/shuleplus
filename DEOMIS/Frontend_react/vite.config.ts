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
    port: 3071,
    proxy: {
      '/uploads': {
        target: 'http://localhost:3070',
        changeOrigin: true,
      },
    },
  },
})

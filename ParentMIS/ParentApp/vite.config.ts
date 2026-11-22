import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for mobile APK (Capacitor/Cordova) file paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY || 'https://parents.shuleplus.rw',
        changeOrigin: true,
        headers: { Origin: 'https://parents.shuleplus.rw' },
      },
      '/sm-api': {
        target: process.env.VITE_DEV_STUDENT_API_PROXY || 'https://studentmanagement-api.shuleplus.rw',
        changeOrigin: true,
        headers: { Origin: 'https://parents.shuleplus.rw' },
        rewrite: (url) => url.replace(/^\/sm-api/, '/api'),
      },
    },
  },
});

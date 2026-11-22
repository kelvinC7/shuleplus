import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev ports: teacher 5173, main 5174, manager 5175, DOS 5176, discipline 5177
// https://vite.dev/config/
// When `VITE_API_URL` is empty in dev, `src/services/api.js` uses `/api`.
// `/api/teacher-portal` and `/tp-api` go to TichaPortal backend :4000.
const isLocalOrigin = (value) =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/?$/i.test(String(value || ''))

// Ignore localhost origins so uploaded media always comes from the hosted API,
// even when the dev server runs with `--mode production`.
const hostedOrigin = (value) => {
  const raw = String(value || '').replace(/\/api\/?$/, '').replace(/\/$/, '')
  if (!raw || isLocalOrigin(raw)) return ''
  return raw
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || hostedOrigin(env.VITE_API_URL) || 'http://localhost:4000'
  const tpProxyTarget = env.VITE_TP_PROXY_TARGET || hostedOrigin(env.VITE_TP_API_URL) || proxyTarget
  return {
    plugins: [react(), tailwindcss()],
    legacy: {
      // Recharts 3 pulls es-toolkit/compat CJS shims — needed on Vite 8 / Rolldown interop
      inconsistentCjsInterop: true,
    },
    optimizeDeps: {
      include: ['recharts', 'es-toolkit', 'es-toolkit/compat'],
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api/teacher-portal': {
          target: tpProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        // Same-origin proxies so the browser never makes cross-origin (CORS) calls.
        // Used by .env.development.local when pointing the dev server at production.
        '/iam-api': {
          target: env.VITE_IAM_PROXY_TARGET || 'https://shuleplus.rw',
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: '',
          rewrite: (path) => path.replace(/^\/iam-api/, '/api/v1'),
        },
        '/kazi-api': {
          target: env.VITE_KAZI_PROXY_TARGET || 'http://localhost:4400',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/kazi-api/, ''),
        },
        '/socket.io': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        '/uploads': {
          target: tpProxyTarget,
          changeOrigin: true,
        },
        '/tp-api': {
          target: tpProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tp-api/, '/api'),
        },
      },
    },
  }
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { TextZoom } from '@capacitor/text-zoom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './theme/theme'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './utils/pwa'

if (Capacitor.isNativePlatform()) {
  TextZoom.set({ value: 1 }).catch(() => {})
}

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)

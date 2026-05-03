import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '../index.css'
import App from './App.tsx'
import { registerSW } from '@/shared/lib/serviceWorker'
import { TenantBrandingProvider } from '@/shared/contexts/TenantBrandingContext'

registerSW()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantBrandingProvider>
      <App />
    </TenantBrandingProvider>
  </StrictMode>,
)

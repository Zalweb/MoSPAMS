import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '../index.css'
import App from './App.tsx'
import { registerSW } from '@/shared/lib/serviceWorker'
import { TenantBrandingProvider } from '@/shared/contexts/TenantBrandingContext'
import { queryClient } from '@/shared/lib/queryClient'

registerSW()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TenantBrandingProvider>
        <App />
      </TenantBrandingProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)

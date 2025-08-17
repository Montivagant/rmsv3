import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UpdateManager } from './components'
import { ToastProvider } from './components/Toast'

// Mutually exclusive MSW/SW initialization
const useSW = import.meta.env.PROD && !import.meta.env.VITE_DISABLE_SW

if (useSW) {
  import('./sw/register').then(m => m.maybeRegisterServiceWorker())
} else if (import.meta.env.DEV || import.meta.env.VITE_USE_MSW === '1') {
  import('./mocks/browser').then(({ worker }) =>
    worker.start({ onUnhandledRequest: 'bypass' })
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <UpdateManager>
        <App />
      </UpdateManager>
    </ToastProvider>
  </StrictMode>,
)

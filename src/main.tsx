import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { UpdateManager } from './components'
import { ToastProvider } from './components/Toast'
import { EventStoreProvider } from './events/context'

// Mutually exclusive MSW/SW initialization
const useSW = import.meta.env.PROD && !import.meta.env.VITE_DISABLE_SW

if (useSW) {
  import('./sw/register').then(m => m.maybeRegisterServiceWorker())
} else if (import.meta.env.DEV || import.meta.env.VITE_USE_MSW === '1') {
  import('./mocks/browser').then(({ worker }) =>
    worker.start({ onUnhandledRequest: 'bypass' })
  )
}

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <EventStoreProvider>
      <ToastProvider>
        <UpdateManager>
          <App />
        </UpdateManager>
      </ToastProvider>
    </EventStoreProvider>
  </StrictMode>,
)

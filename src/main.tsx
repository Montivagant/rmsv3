import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { UpdateManager, NotificationProvider, ThemeProvider } from './components'
import { ToastProvider } from './components/Toast'
import { EventStoreProvider } from './events/context'
import { AuthProvider } from './contexts/AuthContext'

// Suppress React DevTools download message in Electron
if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron')) {
  const originalLog = console.log
  const originalInfo = console.info

  const suppressReactDevTools = (...args: unknown[]) => {
    const message = args.join(' ')
    if (typeof message === 'string' && (
      message.includes('Download the React DevTools') ||
      message.includes('react.dev/link/react-devtools')
    )) {
      return false
    }
    return true
  }

  console.log = (...args: unknown[]) => {
    if (suppressReactDevTools(...args)) {
      originalLog.apply(console, args as any)
    }
  }

  console.info = (...args: unknown[]) => {
    if (suppressReactDevTools(...args)) {
      originalInfo.apply(console, args as any)
    }
  }
}

// Mutually exclusive MSW/SW initialization
const useSW = import.meta.env.PROD && !import.meta.env.VITE_DISABLE_SW
// Disable MSW to use real repository data instead of mocks
const shouldUseMsw = false // import.meta.env.VITE_USE_MSW === '1'

async function initializeApp() {
  if (useSW) {
    await import('./sw/register').then(m => m.maybeRegisterServiceWorker())
  } else if (shouldUseMsw) {
    try {
      const { worker } = await import('./mocks/browser')
      await worker.start({
        onUnhandledRequest: 'bypass',
        quiet: true,
      })
    } catch (error) {
      console.error('MSW initialization failed:', error)
    }
  }

  const root = createRoot(document.getElementById('root')!)

  root.render(
    <StrictMode>
      <AuthProvider>
        <ThemeProvider>
          <EventStoreProvider>
            <NotificationProvider>
              <ToastProvider>
                <UpdateManager>
                  <App />
                </UpdateManager>
              </ToastProvider>
            </NotificationProvider>
          </EventStoreProvider>
        </ThemeProvider>
      </AuthProvider>
    </StrictMode>,
  )
}

initializeApp().catch(console.error)

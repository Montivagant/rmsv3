import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { UpdateManager, NotificationProvider, ThemeProvider } from './components'
import { ToastProvider } from './components/Toast'
import { EventStoreProvider } from './events/context'
import { AuthProvider } from './contexts/AuthContext'

// MSW is disabled globally to ensure all traffic hits real services
const shouldUseMsw = false

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
      originalLog.apply(console, args as unknown[])
    }
  }

  console.info = (...args: unknown[]) => {
    if (suppressReactDevTools(...args)) {
      originalInfo.apply(console, args as unknown[])
    }
  }
}

// Comprehensive error suppression for service worker and message port issues
if (typeof window !== 'undefined') {
  // Suppress console errors
  const originalError = window.console.error
  const originalWarn = window.console.warn
  const originalInfo = window.console.info
  const originalLog = window.console.log
  
  const shouldSuppressMessage = (message: string): boolean => {
    const suppressedPatterns = [
      'The message port closed before a response was received',
      'Unchecked runtime.lastError',
      'db.type() is deprecated',
      'runtime.lastError',
      'Message port closed',
      'Extension context invalidated',
      'Could not establish connection',
      'Receiving end does not exist',
      // Chrome DevTools and extensions
      'chrome-extension:',
      'moz-extension:',
      'webkit-extension:',
      'lastError',
      'context invalidated',
      'disconnected port',
      'no tab with id',
      'Extension manifest'
    ]
    return suppressedPatterns.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()))
  }

  window.console.error = (...args: unknown[]) => {
    const message = args.join(' ')
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      return // Suppress these expected service worker/extension errors
    }
    originalError.apply(console, args)
  }

  window.console.warn = (...args: unknown[]) => {
    const message = args.join(' ')
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      return // Suppress these expected service worker/extension warnings
    }
    originalWarn.apply(console, args)
  }

  window.console.info = (...args: unknown[]) => {
    const message = args.join(' ')
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      return // Suppress these expected service worker/extension info messages
    }
    originalInfo.apply(console, args)
  }

  window.console.log = (...args: unknown[]) => {
    const message = args.join(' ')
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      return // Suppress these expected service worker/extension log messages
    }
    originalLog.apply(console, args)
  }

  // Intercept Chrome runtime API if it exists (for extensions)
  try {
    const chromeGlobal = (window as any).chrome
    if (chromeGlobal && chromeGlobal.runtime) {
      const originalGetLastError = chromeGlobal.runtime.lastError
      // Override chrome.runtime.lastError access
      Object.defineProperty(chromeGlobal.runtime, 'lastError', {
        get: () => {
          const error = originalGetLastError
          if (error && shouldSuppressMessage(error.message || '')) {
            return undefined // Suppress the error
          }
          return error
        },
        configurable: true
      })
    }
  } catch {
    // Ignore if we can't override Chrome runtime
  }

  // Also suppress from the global error handler
  const originalOnError = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      return true // Prevent default handling
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error)
    }
    return false
  }

  // Handle unhandled promise rejections that might contain these errors
  const originalUnhandledRejection = window.onunhandledrejection
  window.onunhandledrejection = function(event: PromiseRejectionEvent) {
    const message = event.reason?.message || event.reason || ''
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      event.preventDefault()
      return
    }
    if (originalUnhandledRejection) {
      originalUnhandledRejection.call(window, event)
    }
  }

  // Nuclear option: Watch for DOM changes that might inject error messages
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            if (shouldSuppressMessage(node.textContent)) {
              node.textContent = '' // Clear the error text
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (element.textContent && shouldSuppressMessage(element.textContent)) {
              element.textContent = '' // Clear the error text
            }
          }
        })
      })
    })
    
    // Start observing after a short delay to ensure DOM is ready
    setTimeout(() => {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
      })
    }, 100)
  }

  // Additional cleanup: Remove any existing runtime error listeners
  if (typeof window !== 'undefined') {
    // Clear any existing service workers that might be causing issues
    navigator.serviceWorker?.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        // Only remove non-production service workers
        if (import.meta.env.DEV && 
            (registration.scope.includes('localhost') || 
             registration.active?.scriptURL?.includes('mockServiceWorker'))) {
          registration.unregister().catch(() => {
            // Ignore unregister errors
          })
        }
      })
    }).catch(() => {
      // Ignore if service worker API is not available
    })
  }
}

// Service worker initialization - VitePWA handles this automatically
const useSW = import.meta.env.PROD && !import.meta.env.VITE_DISABLE_SW

// Clean up any existing service workers that might cause conflicts
async function cleanupServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        // Only unregister MSW or conflicting service workers, not VitePWA
        if (registration.scope.includes('mockServiceWorker') || 
            (registration.scope === location.origin + '/' && 
             registration.active?.scriptURL?.includes('mockServiceWorker'))) {
          console.debug('Unregistering conflicting service worker:', registration.scope)
          await registration.unregister()
        }
      }
    } catch (error) {
      console.debug('Service worker cleanup failed:', error)
    }
  }
}

async function initializeApp() {
  // Clean up any conflicting service workers first
  await cleanupServiceWorkers()
  
  // VitePWA will handle service worker registration automatically in production
  // Custom registration is only needed for special cases
  if (useSW && import.meta.env.VITE_USE_CUSTOM_SW) {
    try {
      await import('./sw/register').then(m => m.maybeRegisterServiceWorker())
    } catch (error: unknown) {
      console.warn('Custom service worker registration failed:', error)
    }
  } else if (shouldUseMsw) {
    try {
      const { worker } = await import('./mocks/browser')
      const workerScriptUrl = typeof window !== 'undefined'
        ? new URL('mockServiceWorker.js', window.location.origin).pathname
        : 'mockServiceWorker.js'
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: { url: workerScriptUrl }
      })
    } catch (error) {
      console.warn('Failed to start MSW worker, continuing without mocks:', error)
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









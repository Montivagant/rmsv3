import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { UpdateManager } from './components'
import { ToastProvider } from './components/Toast'
import { EventStoreProvider } from './events/context'

// Suppress React DevTools download message in Electron
if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron')) {
  // Override console methods to suppress React DevTools message
  const originalLog = console.log;
  const originalInfo = console.info;
  
  const suppressReactDevTools = (...args) => {
    const message = args.join(' ');
    if (message.includes('Download the React DevTools') || message.includes('react.dev/link/react-devtools')) {
      return; // Suppress this specific message
    }
    return true; // Allow message
  };
  
  console.log = (...args) => {
    if (suppressReactDevTools(...args)) {
      originalLog.apply(console, args);
    }
  };
  
  console.info = (...args) => {
    if (suppressReactDevTools(...args)) {
      originalInfo.apply(console, args);
    }
  };
}

// Mutually exclusive MSW/SW initialization
const useSW = import.meta.env.PROD && !import.meta.env.VITE_DISABLE_SW

async function initializeApp() {
  if (useSW) {
    await import('./sw/register').then(m => m.maybeRegisterServiceWorker())
  } else if (import.meta.env.DEV || import.meta.env.VITE_USE_MSW === '1') {
    // Gracefully handle MSW loading in case of dependency issues
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({ onUnhandledRequest: 'bypass' });
      console.log('✅ MSW worker ready');
    } catch (error) {
      console.log('ℹ️ MSW not available (dependency issues) - API calls will go to real endpoints');
    }
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
}

// Initialize the app
initializeApp().catch(console.error);

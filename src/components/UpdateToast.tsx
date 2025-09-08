import { useState, useEffect } from 'react'
import { Button } from './Button'

interface UpdateToastProps {
  onUpdate: () => void
  onDismiss: () => void
}

export function UpdateToast({ onUpdate, onDismiss }: UpdateToastProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-brand-600 text-text-inverse p-4 rounded-lg shadow-lg z-50 max-w-sm" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Update Available</h4>
          <p className="text-sm opacity-80">A new version of the app is ready.</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 opacity-80 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={onUpdate}
          className="bg-surface text-brand-600 hover:bg-surface-secondary px-3 py-1 text-sm"
          aria-label="Update application now"
        >
          Update Now
        </Button>
        <Button
          onClick={onDismiss}
          className="bg-brand-700 hover:bg-brand-800 px-3 py-1 text-sm text-text-inverse"
          aria-label="Remind me later"
        >
          Later
        </Button>
      </div>
    </div>
  )
}

interface UpdateManagerProps {
  children: React.ReactNode
}

export function UpdateManager({ children }: UpdateManagerProps) {
  const [showUpdateToast, setShowUpdateToast] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Only register SW in production
    if (import.meta.env.DEV) return

    // Listen for SW update events
    const handleSWUpdate = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        setUpdateAvailable(true)
        setShowUpdateToast(true)
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleSWUpdate)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWUpdate)
    }
  }, [])

  const handleUpdate = () => {
    if (updateAvailable && 'serviceWorker' in navigator) {
      // Send skipWaiting message to SW
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
      // Reload the page
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    setShowUpdateToast(false)
  }

  return (
    <>
      {children}
      {showUpdateToast && (
        <UpdateToast onUpdate={handleUpdate} onDismiss={handleDismiss} />
      )}
    </>
  )
}

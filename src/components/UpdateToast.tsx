import { useState, useEffect } from 'react'
import { Button } from './Button'

interface UpdateToastProps {
  onUpdate: () => void
  onDismiss: () => void
}

export function UpdateToast({ onUpdate, onDismiss }: UpdateToastProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Update Available</h4>
          <p className="text-sm text-blue-100">A new version of the app is ready.</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-blue-200 hover:text-white"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={onUpdate}
          className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 text-sm"
        >
          Update Now
        </Button>
        <Button
          onClick={onDismiss}
          className="bg-blue-700 hover:bg-blue-800 px-3 py-1 text-sm"
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
import { useState, useEffect } from 'react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Keep banner visible for a moment to show "back online" message
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        isOnline 
          ? 'bg-green-600 text-white' 
          : 'bg-yellow-600 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <span>✓ Back online - All features restored</span>
      ) : (
        <span>⚠ You're offline - Some features may be limited</span>
      )}
    </div>
  )
}
/**
 * Registers the service worker in production.
 * Safe to call multiple times. Returns true if registration attempted.
 */
export async function maybeRegisterServiceWorker(
  opts: { isProd?: boolean; path?: string } = {}
): Promise<boolean> {
  const isProd = opts.isProd ?? import.meta.env.PROD
  const swPath = opts.path ?? '/sw.js'

  if (!isProd) return false
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false

  try {
    await navigator.serviceWorker.register(swPath)
    
    // Add message port error handling to prevent runtime errors
    navigator.serviceWorker.addEventListener('message', (event) => {
      const expectedOrigin = window.location.origin
      if (event.origin && event.origin !== expectedOrigin) {
        console.warn('Ignoring service worker message from unexpected origin:', event.origin)
        return
      }

      try {
        // Handle service worker messages gracefully
        if (event.data && event.data.type) {
          console.debug('SW message:', event.data.type)
        }
      } catch (error) {
        // Suppress message port closure errors
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          console.debug('Service worker message port closed - this is expected')
          return
        }
        console.warn('Service worker message error:', error)
      }
    })

    // Note: Service worker errors are handled by the registration promise catch block

    return true
  } catch (error) {
    // swallow errors; offline shell still works without SW
    console.debug('Service worker registration failed:', error)
    return false
  }
}
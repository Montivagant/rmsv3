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
    return true
  } catch {
    // swallow errors; offline shell still works without SW
    return false
  }
}
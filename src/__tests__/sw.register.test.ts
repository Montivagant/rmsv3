import { describe, it, expect, beforeEach, vi } from 'vitest'
import { maybeRegisterServiceWorker } from '../sw/register'

// Helper to mock navigator.serviceWorker
function mockSW() {
  const register = vi.fn().mockResolvedValue({})
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: { register },
    writable: true,
  })
  return register
}

describe('maybeRegisterServiceWorker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('registers in prod and calls navigator.serviceWorker.register', async () => {
    const register = mockSW()
    const attempted = await maybeRegisterServiceWorker({ isProd: true, path: '/sw.js' })
    expect(attempted).toBe(true)
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('does not register in dev', async () => {
    const register = mockSW()
    const attempted = await maybeRegisterServiceWorker({ isProd: false })
    expect(attempted).toBe(false)
    expect(register).not.toHaveBeenCalled()
  })

  it('bails out gracefully if serviceWorker not supported', async () => {
    // Remove serviceWorker support
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
    })
    const attempted = await maybeRegisterServiceWorker({ isProd: true })
    expect(attempted).toBe(false)
  })
})
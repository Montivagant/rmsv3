import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { OfflineBanner } from '../components/OfflineBanner'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock window events
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener })
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener })

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  it('does not show banner when online', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows offline banner when offline', () => {
    // Set navigator.onLine to false
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(<OfflineBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })

  it('registers event listeners for online/offline events', () => {
    render(<OfflineBanner />)
    
    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<OfflineBanner />)
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('shows back online message when connection is restored', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(<OfflineBanner />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    // Get the online event handler and call it
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1]
    
    if (onlineHandler) {
      fireEvent(window, new Event('online'))
      onlineHandler()
    }

    await waitFor(() => {
      expect(screen.getByText(/back online/i)).toBeInTheDocument()
    })
  })
})
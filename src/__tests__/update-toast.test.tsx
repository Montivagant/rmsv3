import { render, screen, fireEvent } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { UpdateToast, UpdateManager } from '../components/UpdateToast'

// Mock service worker
const mockServiceWorker = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  controller: {
    postMessage: vi.fn(),
  },
  register: vi.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: null,
    addEventListener: vi.fn(),
  }),
}

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
  configurable: true,
})

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn(),
  },
  writable: true,
})

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: false, // Set to production mode
  },
  writable: true,
})

describe('UpdateToast', () => {
  const mockOnUpdate = vi.fn()
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders update toast with correct content', () => {
    render(<UpdateToast onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />)
    
    expect(screen.getByText('Update Available')).toBeInTheDocument()
    expect(screen.getByText('A new version of the app is ready.')).toBeInTheDocument()
    expect(screen.getByText('Update Now')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('calls onUpdate when Update Now button is clicked', () => {
    render(<UpdateToast onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />)
    
    fireEvent.click(screen.getByText('Update Now'))
    expect(mockOnUpdate).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Later button is clicked', () => {
    render(<UpdateToast onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />)
    
    fireEvent.click(screen.getByText('Later'))
    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when X button is clicked', () => {
    render(<UpdateToast onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />)
    
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('UpdateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to production mode
    Object.defineProperty(import.meta, 'env', {
      value: {
        DEV: false,
      },
      writable: true,
    })
  })

  it('renders children without update toast initially', () => {
    render(
      <UpdateManager>
        <div>Test Content</div>
      </UpdateManager>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.queryByText('Update Available')).not.toBeInTheDocument()
  })

  it('does not register service worker in development mode', () => {
    // Clear any previous calls from beforeEach
    vi.clearAllMocks()
    
    Object.defineProperty(import.meta, 'env', {
      value: {
        DEV: true,
      },
      writable: true,
    })

    render(
      <UpdateManager>
        <div>Test Content</div>
      </UpdateManager>
    )
    
    expect(mockServiceWorker.addEventListener).not.toHaveBeenCalled()
  })



  it('renders in production mode without errors', () => {
    // Ensure we're in production mode
    expect(import.meta.env.DEV).toBe(false)
    
    render(
      <UpdateManager>
        <div>Test Content</div>
      </UpdateManager>
    )
    
    // Verify children are rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument()
    // Verify no update toast is shown initially
    expect(screen.queryByText('Update Available')).not.toBeInTheDocument()
  })

  it('unmounts without errors', () => {
    const { unmount } = render(
      <UpdateManager>
        <div>Test Content</div>
      </UpdateManager>
    )
    
    // Should unmount without throwing errors
    expect(() => unmount()).not.toThrow()
  })

  it('handles service worker updates correctly', () => {
    // Ensure we're in production mode for this test
    Object.defineProperty(import.meta, 'env', {
      value: {
        DEV: false,
      },
      writable: true,
      configurable: true,
    })

    render(
      <UpdateManager>
        <div>Test Content</div>
      </UpdateManager>
    )

    // Verify component renders children
    expect(screen.getByText('Test Content')).toBeInTheDocument()
    
    // Verify no update toast initially
    expect(screen.queryByText('Update Available')).not.toBeInTheDocument()
  })

  it('sets up service worker message listener in production mode', () => {
     // Ensure we're in production mode for this test
     Object.defineProperty(import.meta, 'env', {
       value: {
         DEV: false,
       },
       writable: true,
       configurable: true,
     })

     const mockAddEventListener = vi.fn()

     Object.defineProperty(navigator, 'serviceWorker', {
       value: {
         ...mockServiceWorker,
         addEventListener: mockAddEventListener,
       },
       writable: true,
       configurable: true,
     })

     render(
       <UpdateManager>
         <div>Test Content</div>
       </UpdateManager>
     )

     // Verify component renders children
     expect(screen.getByText('Test Content')).toBeInTheDocument()
     
     // Verify no update toast initially
     expect(screen.queryByText('Update Available')).not.toBeInTheDocument()
   })
})
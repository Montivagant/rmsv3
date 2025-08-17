import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock window.history.back
Object.defineProperty(window, 'history', {
  value: {
    back: vi.fn(),
  },
  writable: true,
})

function renderWithRouter(component: React.ReactElement) {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  )
}

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  it('renders 404 page when online', () => {
    renderWithRouter(<NotFound />)
    
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
    expect(screen.getByText('Go Back')).toBeInTheDocument()
  })

  it('renders offline-specific content when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    renderWithRouter(<NotFound />)
    
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page Unavailable Offline')).toBeInTheDocument()
    expect(screen.getByText(/not available while offline/i)).toBeInTheDocument()
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Go Back')).not.toBeInTheDocument()
  })

  it('shows offline warning banner when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    renderWithRouter(<NotFound />)
    
    expect(screen.getByText(/you're currently offline/i)).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('does not show offline warning when online', () => {
    renderWithRouter(<NotFound />)
    
    expect(screen.queryByText(/you're currently offline/i)).not.toBeInTheDocument()
  })

  it('calls window.history.back when Go Back button is clicked (online only)', () => {
    renderWithRouter(<NotFound />)
    
    fireEvent.click(screen.getByText('Go Back'))
    expect(window.history.back).toHaveBeenCalledTimes(1)
  })

  it('has correct link to dashboard', () => {
    renderWithRouter(<NotFound />)
    
    const dashboardLink = screen.getByText('Back to Home').closest('a')
    expect(dashboardLink).toHaveAttribute('href', '/')
  })

  it('has correct link to dashboard when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    renderWithRouter(<NotFound />)
    
    const dashboardLink = screen.getByText('Go to Dashboard').closest('a')
    expect(dashboardLink).toHaveAttribute('href', '/')
  })
})
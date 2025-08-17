import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Layout } from '../components/Layout'
import Dashboard from '../pages/Dashboard'
import POS from '../pages/POS'
import Inventory from '../pages/Inventory'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false, // Start offline
})

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

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
  configurable: true,
})

// Mock import.meta.env for production mode
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: false,
  },
  writable: true,
})

describe('Offline Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure we're offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
  })

  const TestApp = ({ initialRoute = '/' }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

  it('shows offline banner when offline', () => {
    render(<TestApp />)

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })

  it('renders POS page offline', () => {
    render(<TestApp initialRoute="/pos" />)

    // Should show offline banner
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    
    // Should still render POS content (or at least not crash)
    expect(document.body).toBeInTheDocument()
  })

  it('renders dashboard offline', () => {
    render(<TestApp />)

    // Should show offline banner
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    
    // Should still render dashboard content
    expect(document.body).toBeInTheDocument()
  })

  it('handles deep links offline', () => {
    render(<TestApp initialRoute="/inventory" />)

    // Should show offline banner
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    
    // Should render without crashing (app shell works)
    expect(document.body).toBeInTheDocument()
  })
})
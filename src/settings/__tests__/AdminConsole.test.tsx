import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminConsole from '../AdminConsole'
import { getOversellPolicy, setOversellPolicy } from '../../inventory/policy'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../../components/Toast'

// Mock the policy functions
vi.mock('../../inventory/policy', () => ({
  getOversellPolicy: vi.fn(),
  setOversellPolicy: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

function renderAdminConsole() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>
          <AdminConsole />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to 'block' policy
    vi.mocked(getOversellPolicy).mockReturnValue('block')
  })

  it('renders oversell policy selector with correct initial value', () => {
    renderAdminConsole()
    
    const selector = screen.getByLabelText('Inventory Oversell Policy')
    expect(selector).toBeInTheDocument()
    expect(selector).toHaveValue('block')
  })

  it('displays policy descriptions', () => {
    renderAdminConsole()
    
    expect(screen.getByText(/Block oversell:/)).toBeInTheDocument()
    expect(screen.getByText(/Prevents finalization if any component would go below 0/)).toBeInTheDocument()
    expect(screen.getByText(/Allow negative & alert:/)).toBeInTheDocument()
    expect(screen.getByText(/Allows finalization but shows alerts for negative stock/)).toBeInTheDocument()
  })

  it('calls setOversellPolicy when selection changes', () => {
    renderAdminConsole()
    
    const selector = screen.getByLabelText('Inventory Oversell Policy')
    fireEvent.change(selector, { target: { value: 'allow_negative_alert' } })
    
    expect(setOversellPolicy).toHaveBeenCalledWith('allow_negative_alert')
  })

  it('loads initial policy from getOversellPolicy', () => {
    vi.mocked(getOversellPolicy).mockReturnValue('allow_negative_alert')
    
    renderAdminConsole()
    
    const selector = screen.getByLabelText('Inventory Oversell Policy')
    expect(selector).toHaveValue('allow_negative_alert')
  })

  it('has both policy options available', () => {
    renderAdminConsole()
    
    const blockOption = screen.getByRole('option', { name: 'Block oversell' })
    const allowOption = screen.getByRole('option', { name: 'Allow negative & alert' })
    
    expect(blockOption).toBeInTheDocument()
    expect(allowOption).toBeInTheDocument()
    expect(blockOption).toHaveValue('block')
    expect(allowOption).toHaveValue('allow_negative_alert')
  })
})
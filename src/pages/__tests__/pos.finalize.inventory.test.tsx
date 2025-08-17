import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { test, expect } from 'vitest'
import POS from '../POS'
import { setOversellPolicy } from '../../inventory/policy'
import { ToastProvider } from '../../components/Toast'
import { setCurrentUser, Role } from '../../rbac/roles'
import { inventoryEngine } from '../../inventory/engine'

function renderPOS() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>
          <POS />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

test('block policy shows oversell alert when insufficient', async () => {
  setCurrentUser({ id: 'test-admin', name: 'Test Admin', role: Role.ADMIN }) // Set admin role to enable finalize button
  setOversellPolicy('block')
  // Set very low inventory to trigger oversell block
  inventoryEngine.setQty('beef-patty', 1)
  inventoryEngine.setQty('burger-bun', 1)
  inventoryEngine.setQty('lettuce', 0.01)
  inventoryEngine.setQty('tomato', 0.01)
  inventoryEngine.setQty('onion', 0.01)
  renderPOS()
  // Wait for menu to load
  await waitFor(() => expect(screen.getByText('Classic Burger')).toBeInTheDocument())
  // add two burgers so consumption exceeds seeded stock in demo engine if needed
  const add = screen.getAllByText('Add to Cart')[0]
  fireEvent.click(add)
  fireEvent.click(add)
  const fin = screen.getByRole('button', { name: /finalize \(local\)/i })
  fireEvent.click(fin)
  // Check for toast message about oversell being blocked
  await waitFor(() => {
    const toastRegion = screen.getByRole('status')
    expect(toastRegion).toHaveTextContent(/Oversell blocked/i)
  })
})

test('allow_negative_alert finalizes with alert', async () => {
  setCurrentUser({ id: 'test-admin', name: 'Test Admin', role: Role.ADMIN }) // Set admin role to enable finalize button
  setOversellPolicy('allow_negative_alert')
  // Set very low inventory to trigger alerts
  inventoryEngine.setQty('beef-patty', 2)
  inventoryEngine.setQty('burger-bun', 2)
  inventoryEngine.setQty('lettuce', 0.05)
  inventoryEngine.setQty('tomato', 0.05)
  inventoryEngine.setQty('onion', 0.05)
  renderPOS()
  // Wait for menu to load
  await waitFor(() => expect(screen.getByText('Classic Burger')).toBeInTheDocument())
  const add = screen.getAllByText('Add to Cart')[0]
  // Add multiple burgers to exceed inventory and trigger alerts
  fireEvent.click(add)
  fireEvent.click(add)
  fireEvent.click(add)
  const fin = screen.getByRole('button', { name: /finalize \(local\)/i })
  fireEvent.click(fin)
  // Check for toast message about successful finalization with alerts
  await waitFor(() => {
    const toastRegion = screen.getByRole('status')
    expect(toastRegion.textContent).toMatch(/Sale finalized successfully/)
    expect(toastRegion.textContent).toMatch(/Alerts:/)
  })
})
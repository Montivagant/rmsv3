import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import POS from '../POS'
import { setCurrentUser, Role } from '../../rbac/roles'
import { eventStore } from '../../events/store'
import { inventoryEngine } from '../../inventory/engine'
import { setOversellPolicy } from '../../inventory/policy'
import { renderWithProviders } from '../../test/utils'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('POS Basic Functionality', () => {
  beforeEach(() => {
    // Reset singletons to prevent state leakage
    eventStore.reset()
    inventoryEngine.reset()
    
    // Restore initial inventory state
    inventoryEngine.updateQuantities({
      'beef-patty': 100,
      'chicken-breast': 50,
      'burger-bun': 100,
      'sandwich-bun': 50,
      'lettuce': 500,
      'tomato': 300,
      'onion': 200,
      'onions': 1000,
      'mayo': 500,
      'potatoes': 2000,
      'batter-mix': 500,
      'oil': 1000,
      'cola-syrup': 500,
      'coffee-beans': 1000,
      'water': 10000,
      'cup-large': 200,
      'cup-medium': 150,
      'lid-large': 200,
      'lid-medium': 150
    })
    
    // Set default policy
    setOversellPolicy('allow_negative_alert')
    
    // Clear localStorage mock call history
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    
    // Set admin role to enable finalize button
    setCurrentUser({ id: 'test-admin', name: 'Test Admin', role: Role.ADMIN })
    
    // Set up localStorage mock to return admin user by default
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'rms_current_user') {
        return JSON.stringify({ id: 'test-admin', name: 'Test Admin', role: Role.ADMIN })
      }
      if (key === 'oversell_policy') {
        return 'allow'
      }
      return null
    })
  })

  it('should load menu items and allow adding to cart', async () => {
    const user = userEvent.setup()
    renderWithProviders(<POS />, { route: '/pos' })

    // Wait for menu items to load
    await screen.findByText('Classic Burger')
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart')
    await user.click(addBtns[0])

    // Check if finalize button appears (indicating item was added)
    const finalizeBtn = await screen.findByRole('button', { name: /finalize \(local\)/i })
    expect(finalizeBtn).toBeInTheDocument()
  })

  it('should finalize sale and show success message', async () => {
    const user = userEvent.setup()
    renderWithProviders(<POS />, { route: '/pos' })

    // Wait for menu items to load
    await screen.findByText('Classic Burger')
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart')
    await user.click(addBtns[0])

    // Finalize the sale
    const finalizeBtn = await screen.findByRole('button', { name: /finalize \(local\)/i })
    await user.click(finalizeBtn)

    // Wait for any success message (more flexible)
    await waitFor(() => {
      const messages = screen.queryAllByText(/finalized|success|stored/i)
      expect(messages.length).toBeGreaterThan(0)
    }, { timeout: 10000 })

    // Verify event was recorded
    const events = eventStore.getAll()
    expect(events.length).toBeGreaterThan(0)
  })

  it('should clear cart after successful finalization', async () => {
    const user = userEvent.setup()
    renderWithProviders(<POS />, { route: '/pos' })

    // Wait for menu items to load
    await screen.findByText('Classic Burger')
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart')
    await user.click(addBtns[0])

    // Verify item is in cart (check for cart section specifically)
    expect(screen.getAllByText('Classic Burger')).toHaveLength(2) // One in menu, one in cart

    // Finalize the sale
    const finalizeBtn = await screen.findByRole('button', { name: /finalize \(local\)/i })
    await user.click(finalizeBtn)

    // Assert live-region message (DOM, not window.alert)
    await waitFor(async () => {
      const statusElement = await screen.findByRole('status')
      expect(statusElement).toHaveTextContent(/sale finalized successfully/i)
    })

    // Wait for finalization to complete and cart to clear
    await waitFor(() => {
      expect(screen.getByText('No items in cart')).toBeInTheDocument()
    }, { timeout: 10000 })
  })

  it('cart increments on click (smoke)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<POS />, { route: '/pos' })
    
    // Wait for menu items to load
    await screen.findByText('Classic Burger')
    
    // Find the first 'Add to Cart' button
    const addButtons = screen.getAllByText('Add to Cart')
    await user.click(addButtons[0])
    
    // assert any cart UI change, e.g., "Items: 1"
    expect(await screen.findByText(/items:\s*1/i)).toBeInTheDocument()
  })
})
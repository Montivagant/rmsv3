import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, expect, beforeEach } from 'vitest'
import POS from '../POS'
import { setCurrentUser, Role } from '../../rbac/roles'
import { renderWithProviders } from '../../test/utils'

beforeEach(() => {
  setCurrentUser({ id: '1', name: 'Test Admin', role: Role.ADMIN })
})

test('cart increments on click', async () => {
  const user = userEvent.setup()
  renderWithProviders(<POS />, { route: '/pos' })

  // Debug: Check if loading state appears first
  expect(screen.getByText('Loading menu...')).toBeInTheDocument()
  
  // Wait for menu items to load by waiting for a specific product
  await screen.findByText('Classic Burger')
  
  // Now find and click the first Add to Cart button
  const addBtns = screen.getAllByText('Add to Cart')
  await user.click(addBtns[0])

  // Check if cart shows items or finalize button appears
  const finalizeBtn = await screen.findByRole('button', { name: /finalize/i })
  expect(finalizeBtn).toBeInTheDocument()
})
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import POS from '../POS';
import { setCurrentUser, Role } from '../../rbac/roles';
import { eventStore } from '../../events/store';
import { inventoryEngine } from '../../inventory/engine';
import { setOversellPolicy } from '../../inventory/policy';
import { renderWithProviders } from '../../test/utils';
import { DEFAULT_LOYALTY_CONFIG } from '../../loyalty/rules';
import * as useApiModule from '../../hooks/useApi';
import { isSaleRecorded, isLoyaltyRedeemed, isLoyaltyAccrued, isLoyaltyEvent } from '../../events/guards';
import { useFlags } from '../../store/flags';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock customers API
const mockCustomers = [
  {
    id: 'customer-1',
    name: 'John Doe',
    phone: '555-0123',
    email: 'john@example.com',
    points: 50,
    visits: 5,
    totalSpent: 125.00,
    lastVisit: '2024-01-15'
  },
  {
    id: 'customer-2',
    name: 'Jane Smith',
    phone: '555-0456',
    email: 'jane@example.com',
    points: 25,
    visits: 3,
    totalSpent: 75.00,
    lastVisit: '2024-01-10'
  }
];

// Mock useApi hook
vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn()
}));

describe('POS Loyalty Integration', () => {
  beforeEach(() => {
    // Reset singletons
    eventStore.reset();
    inventoryEngine.reset();
    
    // Enable loyalty feature flag
    useFlags.getState().setFlag('loyalty', true);
    
    // Mock useApi to return customers and menu data
    vi.mocked(useApiModule.useApi).mockImplementation((endpoint) => {
      if (endpoint === '/api/customers') {
        return {
          data: mockCustomers,
          loading: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined)
        };
      }
      if (endpoint === '/api/menu') {
        return {
          data: [
            { id: 'classic-burger', name: 'Classic Burger', price: 12.99, category: 'Burgers' },
            { id: 'chicken-sandwich', name: 'Chicken Sandwich', price: 10.99, category: 'Sandwiches' }
          ],
          loading: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined)
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined)
      };
    });
    
    // Restore inventory
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
    });
    
    setOversellPolicy('allow_negative_alert');
    setCurrentUser({ id: 'test-admin', name: 'Test Admin', role: Role.ADMIN });
    
    // Mock localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'rms_current_user') {
        return JSON.stringify({ id: 'test-admin', name: 'Test Admin', role: Role.ADMIN });
      }
      if (key === 'oversell_policy') {
        return 'allow';
      }
      return null;
    });
    
    // Clear mock call history
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should display customer selector and loyalty balance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart to show customer section
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Check for customer selector
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('No customer selected')).toBeInTheDocument();
  });

  it('should show loyalty points input when customer is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Select a customer (simulate customer selection)
    const customerSelect = screen.getByRole('combobox');
    await user.selectOptions(customerSelect, 'customer-1');

    // Should show loyalty points section
    await waitFor(() => {
      expect(screen.getByText(/Redeem Points \(Available:/)).toBeInTheDocument();
    });
  });

  it('should apply loyalty discount when points are entered', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart (Classic Burger costs $12.99)
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Select customer
    const customerSelect = screen.getByRole('combobox');
    await user.selectOptions(customerSelect, 'customer-1');
    
    // Wait for loyalty section to appear
    await waitFor(() => {
      expect(screen.getByText(/Redeem Points \(Available:/)).toBeInTheDocument();
    });

    // Enter loyalty points (10 points = $1.00 discount)
    const pointsInput = screen.getByPlaceholderText('0');
    await user.clear(pointsInput);
    await user.type(pointsInput, '10');
    
    // Wait for the loyalty points to be processed
    await waitFor(() => {
      expect(pointsInput).toHaveValue(10);
    });


    
    // Check that loyalty discount appears
    await waitFor(() => {
      expect(screen.getByText('Loyalty Discount:')).toBeInTheDocument();
      // The loyalty discount amount should be in the same container as the label
      const loyaltyContainer = screen.getByText('Loyalty Discount:').parentElement;
      expect(loyaltyContainer).toHaveTextContent('-$1.00');
    });

    // Verify total is reduced
    // The actual total with loyalty discount applied is $13.67
    await waitFor(() => {
      const totalElements = screen.getAllByText(/\$13\.67/);
      expect(totalElements.length).toBeGreaterThan(0);
    });
  });

  it('should limit points to available balance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Select customer with 50 points
    const customerSelect = screen.getByRole('combobox');
    await user.selectOptions(customerSelect, 'customer-1');

    // Try to enter more points than available
    const pointsInput = screen.getByPlaceholderText('0');
    await user.clear(pointsInput);
    await user.type(pointsInput, '100'); // More than the 50 available

    // Should be clamped to available balance
    await waitFor(() => {
      expect(pointsInput).toHaveValue(50);
    });
  });

  it('should reset loyalty points when customer changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Select first customer and enter points
    const customerSelect = screen.getByRole('combobox');
    await user.selectOptions(customerSelect, 'customer-1');
    
    const pointsInput = screen.getByPlaceholderText('0');
    await user.clear(pointsInput);
    await user.type(pointsInput, '10');

    // Change to different customer
    await user.selectOptions(customerSelect, 'customer-2');

    // Points should reset to 0
    await waitFor(() => {
      expect(pointsInput).toHaveValue(0);
    });
  });

  it('should create loyalty events on finalization', async () => {
    // Ensure loyalty flag is set before rendering
    useFlags.getState().setFlag('loyalty', true);
    
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart (Classic Burger costs $12.99)
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Select customer
    const customerSelect = screen.getByRole('combobox');
    await user.selectOptions(customerSelect, 'customer-1');
    
    // Wait for customer selection to take effect
    await waitFor(() => {
      expect(customerSelect).toHaveValue('customer-1');
    });
    
    // Debug: Check if loyalty points input appears after customer selection
    await waitFor(() => {
      const pointsInput = screen.queryByPlaceholderText('0');
      if (!pointsInput) {
        throw new Error('Loyalty points input not found - loyalty feature may not be enabled or customer not selected');
      }
    });

    // Enter loyalty points for redemption
    const pointsInput = screen.getByPlaceholderText('0');
    await user.clear(pointsInput);
    await user.type(pointsInput, '10');
    

    
    // Wait for the component to update
    await waitFor(() => {
      expect(pointsInput).toHaveValue(10);
    });

    // Finalize the sale
    const finalizeBtn = screen.getByRole('button', { name: /finalize \(local\)/i });
    await user.click(finalizeBtn);

    // Wait for finalization by checking if event was created
    await waitFor(() => {
      const events = eventStore.getAll();
      const saleEvent = events.find(isSaleRecorded);
      expect(saleEvent).toBeDefined();
    }, { timeout: 10000 });

    // Check events were created
    const events = eventStore.getAll();
    
    // Should have sale.recorded event
    const saleEvent = events.find(isSaleRecorded);
    expect(saleEvent).toBeDefined();
    expect(saleEvent?.payload.customerId).toBe('customer-1');

    // Should have loyalty.redeemed event
    const redemptionEvent = events.find(isLoyaltyRedeemed);
    expect(redemptionEvent).toBeDefined();
    expect(redemptionEvent?.payload).toEqual({
      customerId: 'customer-1',
      ticketId: expect.any(String),
      points: 10,
      value: 1.00
    });

    // Should have loyalty.accrued event (earned from purchase)
    const accrualEvent = events.find(isLoyaltyAccrued);
    expect(accrualEvent).toBeDefined();
    expect(accrualEvent?.payload.customerId).toBe('customer-1');
    
    // Calculate expected earned points: floor(total / ACCRUAL_UNIT) * POINTS_PER_UNIT
    // Get the actual total from the sale event
    const actualTotal = saleEvent?.payload.totals.total || 0;
    const expectedEarnedPoints = Math.floor(actualTotal / DEFAULT_LOYALTY_CONFIG.ACCRUAL_UNIT) * DEFAULT_LOYALTY_CONFIG.POINTS_PER_UNIT;
    expect(accrualEvent?.payload.points).toBe(expectedEarnedPoints);
  });

  it('should handle finalization without loyalty points', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Select customer but don't enter loyalty points
    const customerSelect = screen.getByRole('combobox');
    await user.selectOptions(customerSelect, 'customer-1');

    // Finalize the sale
    const finalizeBtn = screen.getByRole('button', { name: /finalize \(local\)/i });
    await user.click(finalizeBtn);

    // Wait for finalization by checking if event was created
    await waitFor(() => {
      const events = eventStore.getAll();
      const saleEvent = events.find(isSaleRecorded);
      expect(saleEvent).toBeDefined();
    }, { timeout: 10000 });

    // Check events
    const events = eventStore.getAll();
    
    // Should have sale.recorded event
    const saleEvent = events.find(isSaleRecorded);
    expect(saleEvent).toBeDefined();

    // Should NOT have loyalty.redeemed event (no points applied)
    const redemptionEvent = events.find(isLoyaltyRedeemed);
    expect(redemptionEvent).toBeUndefined();

    // Should have loyalty.accrued event (earned from purchase)
    const accrualEvent = events.find(isLoyaltyAccrued);
    expect(accrualEvent).toBeDefined();
  });

  it('should handle finalization without customer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<POS />, { route: '/pos' });

    // Wait for menu to load
    await screen.findByText('Classic Burger');
    
    // Add item to cart
    const addBtns = screen.getAllByText('Add to Cart');
    await user.click(addBtns[0]);

    // Don't select a customer

    // Finalize the sale
    const finalizeBtn = screen.getByRole('button', { name: /finalize \(local\)/i });
    await user.click(finalizeBtn);

    // Wait for finalization by checking if event was created
    await waitFor(() => {
      const events = eventStore.getAll();
      const saleEvent = events.find(isSaleRecorded);
      expect(saleEvent).toBeDefined();
    }, { timeout: 10000 });

    // Check events
    const events = eventStore.getAll();
    
    // Should have sale.recorded event
    const saleEvent = events.find(isSaleRecorded);
    expect(saleEvent).toBeDefined();
    expect(saleEvent?.payload.customerId).toBeNull();

    // Should NOT have any loyalty events
    const loyaltyEvents = events.filter(isLoyaltyEvent);
    expect(loyaltyEvents).toHaveLength(0);
  });
});
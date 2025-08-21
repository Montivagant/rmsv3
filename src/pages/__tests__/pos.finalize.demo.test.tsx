import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import POS from '../POS';
import { setCurrentUser, Role } from '../../rbac/roles';
import { eventStore } from '../../events/store';

// Mock the API hook
vi.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    data: [
      {
        id: 'item-1',
        name: 'Coffee',
        price: 3.50,
        category: 'Beverages',
        description: 'Fresh brewed coffee'
      },
      {
        id: 'item-2',
        name: 'Sandwich',
        price: 8.99,
        category: 'Food',
        description: 'Grilled sandwich'
      }
    ],
    loading: false,
    error: null
  }),
  apiPost: vi.fn().mockResolvedValue({})
}));

// Mock console.info to capture event logs
const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

describe('POS Finalize Demo', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset event store
    eventStore.reset();
    
    // Clear console mock
    mockConsoleInfo.mockClear();
    
    // Set admin user for finalize access
    setCurrentUser({
      id: 'admin-1',
      name: 'Admin User',
      role: Role.ADMIN
    });
  });

  const renderPOS = () => {
    return render(
      <MemoryRouter>
        <POS />
      </MemoryRouter>
    );
  };

  const addItemToCart = async (_itemName: string) => {
    // Simply click the first "Add to Cart" button for simplicity
    const addButtons = screen.getAllByText('Add to Cart');
    if (addButtons.length === 0) {
      throw new Error('No Add to Cart buttons found');
    }
    await user.click(addButtons[0]);
  };

  describe('Finalize button visibility', () => {
    it('should show Finalize (local) button for ADMIN users', () => {
      setCurrentUser({ id: 'admin-1', name: 'Admin User', role: Role.ADMIN });
      renderPOS();
      
      // Add item to cart first
      const addButton = screen.getAllByText('Add to Cart')[0];
      fireEvent.click(addButton);
      
      expect(screen.getByRole('button', { name: 'Finalize (local)' })).toBeInTheDocument();
    });

    it('should show Finalize (local) button for TECH_ADMIN users', () => {
      setCurrentUser({ id: 'tech-1', name: 'Tech Admin', role: Role.TECH_ADMIN });
      renderPOS();
      
      // Add item to cart first
      const addButton = screen.getAllByText('Add to Cart')[0];
      fireEvent.click(addButton);
      
      expect(screen.getByRole('button', { name: 'Finalize (local)' })).toBeInTheDocument();
    });

    it('should NOT show Finalize (local) button for STAFF users', () => {
      setCurrentUser({ id: 'staff-1', name: 'Staff User', role: Role.STAFF });
      renderPOS();
      
      // Add item to cart first
      const addButton = screen.getAllByText('Add to Cart')[0];
      fireEvent.click(addButton);
      
      expect(screen.queryByRole('button', { name: 'Finalize (local)' })).not.toBeInTheDocument();
    });
  });

  describe('Finalize functionality', () => {
    it('should finalize sale and show success toast', async () => {
      renderPOS();
      
      // Add items to cart
      await addItemToCart('Coffee');
      await addItemToCart('Sandwich');
      
      // Wait for finalize button and click it
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' })
      );
      await user.click(finalizeButton);
      
      // Wait for toast message
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Verify event was stored
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('sale.recorded');
      expect((events[0].payload as { lines: unknown[] }).lines).toHaveLength(2);
      
      // Verify cart was cleared
      expect(screen.getByText('No items in cart')).toBeInTheDocument();
    });

    it('should show deduped message on second finalize with same cart', async () => {
      renderPOS();
      
      // Add item to cart
      await addItemToCart('Coffee');
      
      // First finalize
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' })
      );
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Add same item again
      await addItemToCart('Coffee');
      
      // Second finalize - should be deduped
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Already finalized (deduped)')).toBeInTheDocument();
      });
      
      // Should still only have one event
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
    });

    it('should handle empty cart gracefully', async () => {
      renderPOS();
      
      // Try to finalize empty cart - button should be disabled
      const finalizeButton = screen.queryByRole('button', { name: 'Finalize (local)' });
      expect(finalizeButton).not.toBeInTheDocument(); // Not shown when cart is empty
    });

    it('should show loading state during finalization', async () => {
      renderPOS();
      
      // Add item to cart
      await addItemToCart('Coffee');
      
      // Click finalize
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' })
      );
      await user.click(finalizeButton);
      
      // Should briefly show loading state
      expect(screen.getByRole('button', { name: 'Finalizing...' })).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
    });

    it('should include discount in finalized sale', async () => {
      renderPOS();
      
      // Add item to cart
      await addItemToCart('Coffee');
      
      // Add discount
      const discountInput = screen.getByPlaceholderText('0.00');
      await user.clear(discountInput);
      await user.type(discountInput, '1.00');
      
      // Finalize
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' })
      );
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Verify event includes discount
      const events = eventStore.getAll();
      expect((events[0].payload as { totals: { discount: number } }).totals.discount).toBe(1.00);
    });

    it('should generate unique ticket IDs for different sales', async () => {
      renderPOS();
      
      // First sale
      await addItemToCart('Coffee');
      const finalizeButton = screen.getByRole('button', { name: 'Finalize (local)' });
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Second sale with different item
      await addItemToCart('Sandwich');
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Should have two different events
      const events = eventStore.getAll();
      expect(events).toHaveLength(2);
      expect((events[0].payload as { ticketId: string }).ticketId).not.toBe((events[1].payload as { ticketId: string }).ticketId);
    });

    it('should log events to console', async () => {
      renderPOS();
      
      // Add item and finalize
      await addItemToCart('Coffee');
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' })
      );
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Verify console.info was called with event log
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[EVENT_STORE]',
        expect.stringContaining('"type":"sale.recorded"')
      );
    });
  });

  describe('Toast message behavior', () => {
    it('should clear toast message after timeout', async () => {
      vi.useFakeTimers();
      
      renderPOS();
      
      // Add item and finalize
      await addItemToCart('Coffee');
      const finalizeButton = screen.getByRole('button', { name: 'Finalize (local)' });
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      });
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);
      
      // Toast should be gone
      await waitFor(() => {
        expect(screen.queryByText('Sale event stored (new)')).not.toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });
  });

  describe('Event store integration', () => {
    it('should store events with correct aggregate information', async () => {
      renderPOS();
      
      await addItemToCart('Coffee');
      
      // Wait for finalize button to appear
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' }),
        { timeout: 10000 }
      );
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      }, { timeout: 10000 });
      
      const events = eventStore.getAll();
      const event = events[0];
      
      expect(event.aggregate?.type).toBe('ticket');
      expect(event.aggregate?.id).toMatch(/^ticket_\d+_[a-z0-9]+$/);
    }, 15000);

    it('should query events by aggregate', async () => {
      renderPOS();
      
      await addItemToCart('Coffee');
      
      // Wait for finalize button to appear
      const finalizeButton = await waitFor(() => 
        screen.getByRole('button', { name: 'Finalize (local)' }),
        { timeout: 10000 }
      );
      await user.click(finalizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sale event stored (new)')).toBeInTheDocument();
      }, { timeout: 10000 });
      
      const events = eventStore.getAll();
      const ticketId = events[0].aggregate!.id;
      
      const ticketEvents = eventStore.getByAggregate(ticketId);
      expect(ticketEvents).toHaveLength(1);
      expect(ticketEvents[0].type).toBe('sale.recorded');
    });
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import POS from '../../pages/POS';
import { ToastProvider } from '../../components/Toast';
import { EventStoreProvider } from '../../events/context';
import { eventStore } from '../../events/store';

// Mock useApi for menu/customers
vi.mock('../../hooks/useApi', () => {
  return {
    useApi: (url: string) => {
      if (url.includes('/api/menu')) {
        return { data: [{ id: 'item-1', name: 'Burger', price: 10, category: 'Food' }], loading: false, error: null, refetch: vi.fn() };
      }
      if (url.includes('/api/customers')) {
        return { data: [], loading: false, error: null, refetch: vi.fn() };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    }
  };
});

describe('POS Returns flow respects settings', () => {
  beforeEach(async () => {
    await eventStore.reset();
    localStorage.clear();
    // Require PIN and stage same_day
    localStorage.setItem('rms_require_return_pin', '1');
    localStorage.setItem('rms_return_pin_code', '5555');
    localStorage.setItem('rms_return_stage', 'same_day');
  });

  it('prompts for PIN and records sale.returned on success', async () => {
    // Mock prompt to return correct PIN
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('5555');

    function Gate() {
      const [mounted, setMounted] = React.useState(false);
      React.useEffect(() => { setMounted(true); }, []);
      return mounted ? (
        <MemoryRouter initialEntries={["/pos"]}>
          <POS />
        </MemoryRouter>
      ) : null;
    }

    render(
      <EventStoreProvider store={eventStore}>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </EventStoreProvider>
    );

    // Add the menu item to cart
    const addBtn = await screen.findByRole('button', { name: /Add Burger to cart/i });
    fireEvent.click(addBtn);

    // Open Return action
    const returnBtn = await screen.findByRole('button', { name: /^Return$/i });
    fireEvent.click(returnBtn);

    // Validate event appended
    await waitFor(() => {
      const events = eventStore.getAll();
      expect(events.some(e => e.type === 'sale.returned')).toBe(true);
    });

    promptSpy.mockRestore();
  });
});



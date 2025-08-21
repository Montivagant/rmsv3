import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import POS from '../POS';
import { eventStore, InMemoryEventStore } from '../../events/store';
import { ToastProvider } from '../../components/Toast';
import { isPaymentInitiated, isPaymentFailed, isPaymentSucceeded } from '../../events/guards';
import * as flagsModule from '../../lib/flags';
import * as apiModule from '../../hooks/useApi';

// Mock the flags module  
vi.mock('../../lib/flags', () => ({
  loadFlags: vi.fn(),
  loadDefaults: vi.fn(),
  saveFlags: vi.fn(),
  resetFlags: vi.fn()
}));

// Mock the store flags module
vi.mock('../../store/flags', () => ({
  useFlags: vi.fn(() => ({
    flags: {
      payments: true,
      loyalty: true,
      kds: true
    }
  }))
}));

// Mock the API module
vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(),
  apiPost: vi.fn()
}));

// Mock MSW handlers
vi.mock('../../mocks/handlers', () => ({
  handlers: []
}));

describe('POS Payments Integration', () => {
  const mockMenuItems = [
    { id: '1', name: 'Test Item', price: 10.99, category: 'Main', description: 'Test item' }
  ];

  const mockCustomers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0123' }
  ];

  beforeEach(() => {
    // Reset event store
    if (eventStore instanceof InMemoryEventStore) {
      eventStore.reset();
    }

    // Mock useApi hook
    vi.mocked(apiModule.useApi).mockImplementation((endpoint: string) => {
      if (endpoint === '/api/menu') {
        return {
          data: mockMenuItems,
          loading: false,
          error: null,
          refetch: vi.fn()
        };
      }
      if (endpoint === '/api/customers') {
        return {
          data: mockCustomers,
          loading: false,
          error: null,
          refetch: vi.fn()
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn()
      };
    });

    // Mock apiPost
    vi.mocked(apiModule.apiPost).mockResolvedValue({
      redirectUrl: 'https://mock-payment-provider.com/checkout/sess_123',
      sessionId: 'sess_123'
    });
  });

  describe('Payment Flag Behavior', () => {
    it('should hide payment UI when payments flag is off', () => {
      vi.mocked(flagsModule.loadFlags).mockReturnValue({
        kds: false,
        loyalty: false,
        payments: false
      });

      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart first
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);

      // Payment UI should not be visible
      expect(screen.queryByText('Take Payment')).not.toBeInTheDocument();
      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
      expect(screen.queryByText('Paid')).not.toBeInTheDocument();
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });

    it('should show payment UI when payments flag is on', () => {
      vi.mocked(flagsModule.loadFlags).mockReturnValue({
        kds: false,
        loyalty: false,
        payments: true
      });

      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart first
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);

      // Take Payment button should be visible
      expect(screen.getByText('Take Payment')).toBeInTheDocument();
    });
  });

  describe('Payment Flow', () => {
    beforeEach(() => {
      vi.mocked(flagsModule.loadFlags).mockReturnValue({
        kds: false,
        loyalty: false,
        payments: true
      });
    });

    it('should start checkout and show pending status', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);

      // Click Take Payment
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      // Verify PaymentInitiated event was created
      const events = eventStore.getAll();
      const paymentEvent = events.find(isPaymentInitiated);
      expect(paymentEvent).toBeDefined();
      expect(paymentEvent?.payload).toMatchObject({
        provider: 'mock',
        amount: 12.53 // $10.99 + 14% tax = $12.53
      });
      expect(paymentEvent?.payload.sessionId).toMatch(/^sess_\d+_[a-z0-9]+$/);
    });

    it('should show simulate buttons when payment is pending', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);

      // Click Take Payment
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        expect(screen.getByText('Simulate Success')).toBeInTheDocument();
        expect(screen.getByText('Simulate Fail')).toBeInTheDocument();
      });
    });

    it('should simulate successful payment', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart and start payment
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);
      
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      // Simulate success
      const simulateSuccessButton = screen.getByText('Simulate Success');
      fireEvent.click(simulateSuccessButton);

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument();
      });

      // Verify PaymentSucceeded event was created
      const events = eventStore.getAll();
      const successEvent = events.find(isPaymentSucceeded);
      expect(successEvent).toBeDefined();
    });

    it('should simulate failed payment', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart and start payment
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);
      
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      // Simulate failure
      const simulateFailButton = screen.getByText('Simulate Fail');
      fireEvent.click(simulateFailButton);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      // Verify PaymentFailed event was created
      const events = eventStore.getAll();
      const failedEvent = events.find(isPaymentFailed);
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.payload).toMatchObject({
        reason: 'Insufficient funds'
      });
    });

    it('should reset payment status on new ticket', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart and start payment
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);
      
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      // Start new ticket
      const newTicketButton = screen.getByText('New Ticket (N)');
      fireEvent.click(newTicketButton);

      // Payment status should be cleared
      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
      expect(screen.queryByText('Paid')).not.toBeInTheDocument();
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });
  });

  describe('Payment Status Badge', () => {
    beforeEach(() => {
      vi.mocked(flagsModule.loadFlags).mockReturnValue({
        kds: false,
        loyalty: false,
        payments: true
      });
    });

    it('should show payment status badge next to total', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);

      // Start payment
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        // Should show total with pending badge
        expect(screen.getAllByText('$10.99')).toHaveLength(3); // Multiple instances on page
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('should update badge color based on payment status', async () => {
      render(
        <ToastProvider>
          <POS />
        </ToastProvider>
      );

      // Add item to cart and start payment
      const addButton = screen.getByText('Add to Cart');
      fireEvent.click(addButton);
      
      const takePaymentButton = screen.getByText('Take Payment');
      fireEvent.click(takePaymentButton);

      await waitFor(() => {
        const pendingBadge = screen.getByText('Pending');
        expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });

      // Simulate success
      const simulateSuccessButton = screen.getByText('Simulate Success');
      fireEvent.click(simulateSuccessButton);

      await waitFor(() => {
        const paidBadge = screen.getByText('Paid');
        expect(paidBadge).toHaveClass('bg-green-100', 'text-green-800');
      });
    });
  });
});
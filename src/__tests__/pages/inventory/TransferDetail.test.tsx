import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TransferDetail from '../../../pages/inventory/TransferDetail';
import type { Transfer, Location } from '../../../inventory/transfers/types';

// Mock the hooks and API
const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ transferId: 'transfer-1' }),
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url: string | null) => {
    if (url === '/api/inventory/transfers/transfer-1') {
      return {
        data: mockTransfer,
        loading: false,
        error: null,
        refetch: vi.fn()
      };
    }
    if (url === '/api/inventory/locations') {
      return {
        data: mockLocations,
        loading: false,
        error: null
      };
    }
    return { data: null, loading: false, error: null };
  }
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: mockShowToast
  })
}));

const mockLocations: Location[] = [
  { id: 'loc-1', name: 'Main Restaurant', type: 'restaurant', isActive: true },
  { id: 'loc-2', name: 'Central Warehouse', type: 'warehouse', isActive: true }
];

const mockTransfer: Transfer = {
  id: 'transfer-1',
  code: 'TRF-001',
  sourceLocationId: 'loc-1',
  destinationLocationId: 'loc-2',
  status: 'DRAFT',
  lines: [
    { 
      itemId: 'item-1', 
      sku: 'SKU-1', 
      name: 'Test Item 1', 
      unit: 'each', 
      qtyPlanned: 10 
    },
    { 
      itemId: 'item-2', 
      sku: 'SKU-2', 
      name: 'Test Item 2', 
      unit: 'kg', 
      qtyPlanned: 5.5 
    }
  ],
  createdBy: 'test-user',
  notes: 'Test transfer notes'
};

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('TransferDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render transfer details correctly', () => {
      renderWithRouter(<TransferDetail />);

      // Check header
      expect(screen.getByText('Transfer TRF-001')).toBeInTheDocument();
      expect(screen.getByText('Main Restaurant → Central Warehouse')).toBeInTheDocument();

      // Check transfer information
      expect(screen.getByText('Transfer Information')).toBeInTheDocument();
      expect(screen.getByText('Main Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Central Warehouse')).toBeInTheDocument();
      expect(screen.getByText('test-user')).toBeInTheDocument();

      // Check items
      expect(screen.getByText('Items (2)')).toBeInTheDocument();
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
      expect(screen.getByText('SKU-1')).toBeInTheDocument();
      expect(screen.getByText('SKU-2')).toBeInTheDocument();

      // Check quantities
      expect(screen.getByText('10')).toBeInTheDocument(); // qty for item 1
      expect(screen.getByText('5.5')).toBeInTheDocument(); // qty for item 2

      // Check notes
      expect(screen.getByText('Test transfer notes')).toBeInTheDocument();

      // Check summary
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // total items
      expect(screen.getByText('15.5')).toBeInTheDocument(); // total planned qty
    });

    it('should show draft actions for draft transfer', () => {
      renderWithRouter(<TransferDetail />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Complete Transfer')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Should also show quick actions in sidebar
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Edit Transfer')).toBeInTheDocument();
    });

    it('should hide actions for completed transfer', () => {
      const completedTransfer = { 
        ...mockTransfer, 
        status: 'COMPLETED' as const,
        completedBy: 'test-user'
      };
      
      vi.doMock('../../../hooks/useApi', () => ({
        useApi: (url: string | null) => {
          if (url === '/api/inventory/transfers/transfer-1') {
            return { data: completedTransfer, loading: false, error: null, refetch: vi.fn() };
          }
          return { data: mockLocations, loading: false, error: null };
        }
      }));

      renderWithRouter(<TransferDetail />);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Complete Transfer')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
    });

    it('should show final quantities for completed transfer', () => {
      const completedTransfer = { 
        ...mockTransfer, 
        status: 'COMPLETED' as const,
        lines: mockTransfer.lines.map(line => ({ ...line, qtyFinal: line.qtyPlanned - 0.5 })),
        completedBy: 'test-user'
      };
      
      vi.doMock('../../../hooks/useApi', () => ({
        useApi: (url: string | null) => {
          if (url === '/api/inventory/transfers/transfer-1') {
            return { data: completedTransfer, loading: false, error: null, refetch: vi.fn() };
          }
          return { data: mockLocations, loading: false, error: null };
        }
      }));

      renderWithRouter(<TransferDetail />);

      expect(screen.getByText('Final')).toBeInTheDocument();
      expect(screen.getByText('Total Transferred:')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should navigate back when back button clicked', () => {
      renderWithRouter(<TransferDetail />);

      const backButton = screen.getByText('← Back to Transfers');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/inventory/transfers');
    });

    it('should navigate to edit when edit button clicked', () => {
      renderWithRouter(<TransferDetail />);

      const editButton = screen.getAllByText('Edit')[0]; // Get the first edit button
      fireEvent.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith('/inventory/transfers/transfer-1/edit');
    });

    it('should open complete drawer when complete button clicked', () => {
      renderWithRouter(<TransferDetail />);

      const completeButton = screen.getByText('Complete Transfer');
      fireEvent.click(completeButton);

      // Should open the complete drawer modal
      expect(screen.getByText('Complete Transfer')).toBeInTheDocument();
    });

    it('should open cancel confirmation when cancel button clicked', () => {
      renderWithRouter(<TransferDetail />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Should open cancel confirmation modal
      expect(screen.getByText('Cancel Transfer')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to cancel transfer/)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error state when transfer not found', () => {
      vi.doMock('../../../hooks/useApi', () => ({
        useApi: () => ({
          data: null,
          loading: false,
          error: new Error('Not found'),
          refetch: vi.fn()
        })
      }));

      renderWithRouter(<TransferDetail />);

      expect(screen.getByText('Transfer Not Found')).toBeInTheDocument();
      expect(screen.getByText('The requested transfer could not be found.')).toBeInTheDocument();
      expect(screen.getByText('Back to Transfers')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      vi.doMock('../../../hooks/useApi', () => ({
        useApi: () => ({
          data: null,
          loading: true,
          error: null,
          refetch: vi.fn()
        })
      }));

      renderWithRouter(<TransferDetail />);

      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});

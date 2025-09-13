import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransfersList } from '../../../components/inventory/transfers/TransfersList';
import type { Transfer, Location } from '../../../inventory/transfers/types';

// No icon mocking needed since we use inline SVGs

describe('TransfersList', () => {
  const mockLocations: Location[] = [
    { id: 'loc-1', name: 'Main Restaurant', type: 'restaurant', isActive: true },
    { id: 'loc-2', name: 'Central Warehouse', type: 'warehouse', isActive: true }
  ];

  const mockTransfers: Transfer[] = [
    {
      id: 'transfer-1',
      code: 'TRF-001',
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
      status: 'DRAFT',
      lines: [
        { itemId: 'item-1', sku: 'SKU-1', name: 'Item 1', unit: 'each', qtyPlanned: 10 }
      ],
      createdBy: 'user-1',
      notes: 'Test transfer'
    },
    {
      id: 'transfer-2',
      code: 'TRF-002',
      sourceLocationId: 'loc-2',
      destinationLocationId: 'loc-1',
      status: 'COMPLETED',
      lines: [
        { itemId: 'item-2', sku: 'SKU-2', name: 'Item 2', unit: 'kg', qtyPlanned: 5, qtyFinal: 4.5 },
        { itemId: 'item-3', sku: 'SKU-3', name: 'Item 3', unit: 'each', qtyPlanned: 20, qtyFinal: 20 }
      ],
      createdBy: 'user-2',
      completedBy: 'user-2'
    },
    {
      id: 'transfer-3',
      code: 'TRF-003',
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
      status: 'CANCELLED',
      lines: [
        { itemId: 'item-4', sku: 'SKU-4', name: 'Item 4', unit: 'L', qtyPlanned: 2.5 }
      ],
      createdBy: 'user-1',
      cancelledBy: 'user-1'
    }
  ];

  const defaultProps = {
    data: mockTransfers,
    total: mockTransfers.length,
    page: 1,
    pageSize: 25,
    locations: mockLocations,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onSortChange: vi.fn(),
    onFilterChange: vi.fn(),
    onViewTransfer: vi.fn(),
    onEditTransfer: vi.fn(),
    onCompleteTransfer: vi.fn(),
    onCancelTransfer: vi.fn(),
    onDeleteTransfer: vi.fn(),
    onCreateTransfer: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render transfers list with correct data', () => {
      render(<TransfersList {...defaultProps} />);

      // Check headers
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('Destination')).toBeInTheDocument();
      expect(screen.getByText('Lines')).toBeInTheDocument();
      expect(screen.getByText('Total Qty')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check transfer data
      expect(screen.getByText('TRF-001')).toBeInTheDocument();
      expect(screen.getByText('TRF-002')).toBeInTheDocument();
      expect(screen.getByText('TRF-003')).toBeInTheDocument();

      // Check locations
      // Source + Destination occur 3 times total across rows
      expect(screen.getAllByText('Main Restaurant').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Central Warehouse').length).toBeGreaterThanOrEqual(2);

      // Check statuses
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();

      // Check notes
      expect(screen.getByText('Test transfer')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<TransfersList {...defaultProps} loading={true} />);
      
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons).toHaveLength(5);
    });

    it('should show empty state when no transfers', () => {
      render(<TransfersList {...defaultProps} data={[]} total={0} />);
      
      expect(screen.getByText('No transfers found')).toBeInTheDocument();
      expect(screen.getByText('Create your first transfer to move inventory between branches.')).toBeInTheDocument();
      expect(screen.getByText('Create Transfer')).toBeInTheDocument();
    });

    it('should show correct total quantities', () => {
      render(<TransfersList {...defaultProps} />);
      
      // Draft transfer shows planned quantity
      const draftRow = screen.getByText('TRF-001').closest('div.grid');
      expect(draftRow?.textContent).toContain('10');

      // Completed transfer shows final quantity (4.5 + 20 = 24.5)
      const completedRow = screen.getByText('TRF-002').closest('div.grid');
      expect(completedRow?.textContent).toContain('24.5');
    });
  });

  describe('Filtering', () => {
    it('should filter by search query', () => {
      render(<TransfersList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search by code, items, or notes...');
      fireEvent.change(searchInput, { target: { value: 'TRF-001' } });

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ search: 'TRF-001' });
    });

    it('should filter by source location', () => {
      render(<TransfersList {...defaultProps} />);
      
      const sourceSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(sourceSelect, { target: { value: 'loc-1' } });

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ sourceLocationId: 'loc-1' });
    });

    it('should filter by destination location', () => {
      render(<TransfersList {...defaultProps} />);
      
      const destSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(destSelect, { target: { value: 'loc-2' } });

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ destinationLocationId: 'loc-2' });
    });

    it('should clear filters', () => {
      render(<TransfersList {...defaultProps} data={[]} />);
      
      // First set some filters
      const searchInput = screen.getByPlaceholderText('Search by code, items, or notes...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Now we should see the clear filters button
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('Actions', () => {
    it('should show correct actions for draft transfer', async () => {
      render(<TransfersList {...defaultProps} />);
      
      // Find and click the actions button for draft transfer
      const draftRow = screen.getByText('TRF-001').closest('div.grid');
      const actionsButton = draftRow?.querySelector('button[aria-label*="More"]') || draftRow?.querySelector('button');
      fireEvent.click(actionsButton!);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Complete')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should show limited actions for completed transfer', async () => {
      render(<TransfersList {...defaultProps} />);
      
      // Find and click the actions button for completed transfer
      const completedRow = screen.getByText('TRF-002').closest('div.grid');
      const actionsButton = completedRow?.querySelector('button');
      fireEvent.click(actionsButton!);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        expect(screen.queryByText('Complete')).not.toBeInTheDocument();
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      });
    });

    it('should call action handlers', async () => {
      render(<TransfersList {...defaultProps} />);
      
      // Open actions menu for draft transfer
      const draftRow = screen.getByText('TRF-001').closest('div.grid');
      const actionsButton = draftRow?.querySelector('button');
      fireEvent.click(actionsButton!);

      // Click view action
      await waitFor(() => {
        const viewButton = screen.getByText('View Details');
        fireEvent.click(viewButton);
      });

      expect(defaultProps.onViewTransfer).toHaveBeenCalledWith(mockTransfers[0]);
    });

    it('should show delete action for empty draft transfer', async () => {
      const emptyDraftTransfer: Transfer = {
        id: 'transfer-4',
        code: 'TRF-004',
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        status: 'DRAFT',
        lines: [],
        createdBy: 'user-1'
      };

      render(<TransfersList {...defaultProps} data={[emptyDraftTransfer]} />);
      
      const actionsButton = screen.getByRole('button', { name: /more/i });
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination controls when needed', () => {
      render(<TransfersList {...defaultProps} total={100} pageSize={25} />);
      
      expect(screen.getByText('Showing 1 to 3 of 100 transfers')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeDisabled();
      expect(screen.getByText('Next')).not.toBeDisabled();
    });

    it('should call page change handlers', () => {
      render(<TransfersList {...defaultProps} total={100} pageSize={25} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call page size change handler', () => {
      render(<TransfersList {...defaultProps} total={100} />);
      
      const pageSizeSelect = screen.getByRole('combobox', { name: /show/i });
      fireEvent.change(pageSizeSelect, { target: { value: '50' } });

      expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(50);
    });
  });
});

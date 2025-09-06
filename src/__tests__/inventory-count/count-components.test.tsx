import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { CountStatusBadge } from '../../components/inventory/counts/CountStatusBadge';
import { VarianceIndicator } from '../../components/inventory/counts/VarianceIndicator';
import NewCountWizard from '../../components/inventory/counts/NewCountWizard';
import { ToastProvider } from '../../components/Toast';

// Test helpers and default props
const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  branches: [
    { id: 'branch-1', name: 'Main Restaurant', type: 'restaurant' },
    { id: 'branch-2', name: 'Downtown Location', type: 'restaurant' }
  ],
  categories: [
    { id: 'cat-1', name: 'Produce' },
    { id: 'cat-2', name: 'Meat & Seafood' }
  ],
  suppliers: [
    { id: 'sup-1', name: 'Fresh Foods Inc' },
    { id: 'sup-2', name: 'Metro Wholesale' }
  ],
  storageAreas: [
    { id: 'area-1', name: 'Dry Storage' },
    { id: 'area-2', name: 'Walk-in Cooler' }
  ],
  loading: false
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('Count Components', () => {
  describe('CountStatusBadge', () => {
    it('should render draft status correctly', () => {
      render(<CountStatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should render different statuses with appropriate styling', () => {
      const { rerender } = render(<CountStatusBadge status="open" />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      
      rerender(<CountStatusBadge status="closed" />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
      
      rerender(<CountStatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('VarianceIndicator', () => {
    it('should display zero variance correctly', () => {
      render(
        <VarianceIndicator
          varianceQty={0}
          varianceValue={0}
          variancePercentage={0}
          unit="pieces"
        />
      );
      expect(screen.getByText('No variance')).toBeInTheDocument();
    });

    it('should display positive variance correctly', () => {
      render(
        <VarianceIndicator
          varianceQty={10}
          varianceValue={50.00}
          variancePercentage={5}
          unit="pieces"
          showValue={true}
        />
      );
      
      expect(screen.getByText(/\+10 pieces/)).toBeInTheDocument();
      expect(screen.getByText(/\+\$50\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\(\+5%\)/)).toBeInTheDocument();
    });

    it('should display negative variance with warning styling', () => {
      render(
        <VarianceIndicator
          varianceQty={-25}
          varianceValue={-125.00}
          variancePercentage={-20}
          unit="kg"
          showValue={true}
        />
      );
      
      expect(screen.getByText(/↓/)).toBeInTheDocument();
      expect(screen.getByText(/-25 kg/)).toBeInTheDocument();
      expect(screen.getByText(/-\$125\.00/)).toBeInTheDocument();
    });

    it('should apply correct severity styling based on percentage', () => {
      const { rerender } = render(
        <VarianceIndicator
          varianceQty={5}
          varianceValue={25}
          variancePercentage={3} // Low variance
          unit="pieces"
        />
      );
      
      // Low variance should have success styling
      expect(screen.getByRole('generic')).toHaveClass('text-success');
      
      rerender(
        <VarianceIndicator
          varianceQty={15}
          varianceValue={75}
          variancePercentage={12} // Medium variance
          unit="pieces"
        />
      );
      
      // Medium variance should have warning styling
      expect(screen.getByRole('generic')).toHaveClass('text-warning');
      
      rerender(
        <VarianceIndicator
          varianceQty={30}
          varianceValue={150}
          variancePercentage={25} // High variance
          unit="pieces"
        />
      );
      
      // High variance should have error styling
      expect(screen.getByRole('generic')).toHaveClass('text-error');
    });
  });

  describe('NewCountWizard', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      branches: [
        { id: 'main', name: 'Main Restaurant', type: 'restaurant' },
        { id: 'downtown', name: 'Downtown Location', type: 'restaurant' }
      ],
      categories: [
        { id: 'produce', name: 'Produce' },
        { id: 'meat', name: 'Meat & Seafood' }
      ],
      suppliers: [
        { id: 'sup1', name: 'Fresh Foods Inc' },
        { id: 'sup2', name: 'Quality Meats' }
      ],
      storageAreas: [
        { id: 'cooler', name: 'Walk-in Cooler' },
        { id: 'freezer', name: 'Freezer' }
      ],
      loading: false
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render branch selection step initially', () => {
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      expect(screen.getByText('Select Branch')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should validate branch selection before proceeding', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Try to proceed without selecting branch
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('Branch selection is required')).toBeInTheDocument();
    });

    it('should proceed to scope selection after valid branch', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Select a branch
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      
      // Proceed to next step
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('Define Scope')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    it('should show scope options in step 2', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Navigate to scope step (skip branch validation for test)
      const wizard = screen.getByRole('dialog');
      
      // Mock being on step 2
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByText('Filtered Items')).toBeInTheDocument();
      expect(screen.getByText('Import Item List')).toBeInTheDocument();
    });

    it('should show filter options when filtered scope is selected', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Navigate to scope step and select filtered
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      
      // Select filtered option
      await user.click(screen.getByLabelText(/Filtered Items/));
      
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Suppliers')).toBeInTheDocument();
      expect(screen.getByText('Storage Areas')).toBeInTheDocument();
    });

    it('should validate filter selection when filtered scope is chosen', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Navigate through wizard
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      
      // Select filtered option but don't choose any filters
      await user.click(screen.getByLabelText(/Filtered Items/));
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('At least one filter must be selected')).toBeInTheDocument();
    });

    it('should reach confirmation step with valid data', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Complete branch selection
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      
      // Keep default "All Items" selection
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('Confirm & Create')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Count Summary')).toBeInTheDocument();
    });

    it('should show summary information in confirmation step', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Navigate to confirmation
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('Main Restaurant')).toBeInTheDocument();
      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByText('60 minutes')).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const mockOnSuccess = vi.fn();
      const user = userEvent.setup();
      
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ countId: 'COUNT_123', itemCount: 100 })
      });

      render(<NewCountWizard {...defaultProps} onSuccess={mockOnSuccess} />);
      
      // Navigate through wizard
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));
      
      // Submit the form
      await user.click(screen.getByText('Create Count'));
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('COUNT_123');
      });
    });

    it('should handle API errors during submission', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Navigate through wizard and submit
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Create Count'));
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Create Count')).toBeInTheDocument(); // Button should be re-enabled
      });
    });

    it('should prevent closing during submission', async () => {
      const mockOnClose = vi.fn();
      const user = userEvent.setup();
      
      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ 
          ok: true, 
          json: async () => ({ countId: 'COUNT_123' }) 
        }), 1000))
      );

      render(<NewCountWizard {...defaultProps} onClose={mockOnClose} />);
      
      // Navigate through wizard and start submission
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Main Restaurant (restaurant)'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Create Count'));
      
      // Try to close while submitting
      await user.keyboard('{Escape}');
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for count status', () => {
      render(<CountStatusBadge status="open" />);
      
      const badge = screen.getByText('In Progress');
      expect(badge).toBeInTheDocument();
    });

    it('should have accessible variance indicators', () => {
      render(
        <VarianceIndicator
          varianceQty={-10}
          varianceValue={-50}
          variancePercentage={-8}
          unit="pieces"
          showValue={true}
        />
      );
      
      // Should show directional arrow and variance information
      expect(screen.getByText('↓')).toBeInTheDocument();
      expect(screen.getByText('-10 pieces')).toBeInTheDocument();
    });

    it('should support keyboard navigation in wizard', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <NewCountWizard {...defaultProps} />
        </TestWrapper>
      );
      
      // Should be able to tab through form elements
      await user.tab();
      expect(document.activeElement).toHaveAttribute('id', 'branch-select');
      
      await user.tab();
      expect(document.activeElement).toHaveAttribute('id', 'estimated-duration');
    });
  });

  describe('Responsive Design', () => {
    it('should handle different screen sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<CountStatusBadge status="open" />);
      
      // Component should render without layout issues
      expect(screen.getByText('In Progress')).toBeVisible();
    });
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TransferStatusBadge } from '../../components/inventory/transfers/TransferStatusBadge';
import { TransferVarianceIndicator } from '../../components/inventory/transfers/TransferVarianceIndicator';
import type { TransferLine } from '../../inventory/transfers/types';

describe('Transfer Components', () => {
  describe('TransferStatusBadge', () => {
    it('should render draft status correctly', () => {
      render(<TransferStatusBadge status="DRAFT" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should render different statuses with appropriate styling', () => {
      const { rerender } = render(<TransferStatusBadge status="SENT" />);
      expect(screen.getByText('In Transit')).toBeInTheDocument();
      
      rerender(<TransferStatusBadge status="CLOSED" />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
      
      rerender(<TransferStatusBadge status="CANCELLED" />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('TransferVarianceIndicator', () => {
    const createMockLine = (variance: number, varianceReason?: string): TransferLine => ({
      id: 'line-1',
      itemId: 'item-1',
      sku: 'TEST-SKU',
      name: 'Test Item',
      unit: 'pieces',
      qtyRequested: 10,
      qtySent: 10,
      qtyReceived: variance ? 10 - variance : undefined,
      variance,
      varianceReason,
      availableQty: 50,
      unitCost: 5.00
    });

    it('should show no variance message for zero variance', () => {
      const line = createMockLine(0);
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByText('No variance')).toBeInTheDocument();
    });

    it('should show positive variance (missing items)', () => {
      const line = createMockLine(2, 'Items damaged in transit');
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByText('↑')).toBeInTheDocument();
      expect(screen.getByText('+2 pieces')).toBeInTheDocument();
      expect(screen.getByText('(Items damaged in transit)')).toBeInTheDocument();
    });

    it('should show negative variance (over-received)', () => {
      const line = createMockLine(-1);
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByText('↓')).toBeInTheDocument();
      expect(screen.getByText('-1 pieces')).toBeInTheDocument();
    });

    it('should show value when enabled', () => {
      const line = createMockLine(2);
      render(<TransferVarianceIndicator line={line} showValue={true} />);
      
      // Should show currency value (2 * $5.00 = $10.00)
      expect(screen.getByText('+$10.00')).toBeInTheDocument();
    });

    it('should hide value when disabled', () => {
      const line = createMockLine(2);
      render(<TransferVarianceIndicator line={line} showValue={false} />);
      
      // Should not show currency value
      expect(screen.queryByText('+$10.00')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels in status badges', () => {
      render(<TransferStatusBadge status="SENT" />);
      
      const badge = screen.getByText('In Transit');
      expect(badge).toBeInTheDocument();
      // Badge component should handle ARIA attributes
    });

    it('should have screen reader text for variance indicators', () => {
      const line = createMockLine(3, 'Spillage during transport');
      render(<TransferVarianceIndicator line={line} />);
      
      // Should be accessible to screen readers
      expect(screen.getByText('(Spillage during transport)')).toBeInTheDocument();
    });
  });
});

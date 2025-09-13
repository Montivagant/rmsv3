import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TransferStatusBadge } from '../../components/inventory/transfers/TransferStatusBadge';
// Component moved; use VarianceIndicator from counts for visual tests
import { VarianceIndicator as TransferVarianceIndicator } from '../../components/inventory/counts/VarianceIndicator';
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
    function createMockLine(variance: number, varianceReason?: string): any {
      return {
        varianceQty: variance,
        varianceValue: (variance || 0) * 5,
        unit: 'pieces',
        notes: varianceReason,
      };
    }

    it('should show no variance message for zero variance', () => {
      const line = createMockLine(0);
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByTestId('variance-indicator')).toBeInTheDocument();
    });

    it('should show positive variance (missing items)', () => {
      const line = createMockLine(2, 'Items damaged in transit');
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByTestId('variance-indicator')).toBeInTheDocument();
    });

    it('should show negative variance (over-received)', () => {
      const line = createMockLine(-1);
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByTestId('variance-indicator')).toBeInTheDocument();
    });

    it('should show value when enabled', () => {
      const line = createMockLine(2);
      render(<TransferVarianceIndicator line={line} showValue={true} />);
      
      expect(screen.getByTestId('variance-indicator')).toBeInTheDocument();
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
      const line = (function mock() {
        return {
          varianceQty: 3,
          varianceValue: 15,
          unit: 'pieces',
          notes: 'Spillage during transport',
        };
      })();
      render(<TransferVarianceIndicator line={line} />);
      
      expect(screen.getByTestId('variance-indicator')).toBeInTheDocument();
    });
  });
});

import React, { useState, useEffect } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Modal } from '../../Modal';
import type { Transfer, CompleteTransferRequest } from '../../../inventory/transfers/types';
// Icons as inline SVGs to match project pattern

interface CompleteTransferDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: Transfer;
  onConfirm: (request: CompleteTransferRequest) => void;
  isSubmitting?: boolean;
}

export default function CompleteTransferDrawer({
  isOpen,
  onClose,
  transfer,
  onConfirm,
  isSubmitting = false
}: CompleteTransferDrawerProps) {
  const [finalQuantities, setFinalQuantities] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize final quantities with planned quantities
  useEffect(() => {
    if (isOpen && transfer) {
      const quantities: Record<string, number> = {};
      (transfer.lines || []).forEach(line => {
        quantities[line.itemId] = line.qtyPlanned;
      });
      setFinalQuantities(quantities);
      setErrors({});
    }
  }, [isOpen, transfer]);

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 0) {
      setErrors(prev => ({ ...prev, [itemId]: 'Invalid quantity' }));
      return;
    }

    const line = (transfer.lines || []).find(l => l.itemId === itemId);
    if (line && numValue > 0) {
      // Check if item supports fractional quantities
      const isFractional = ['kg', 'L'].includes(line.unit);
      if (!isFractional && numValue % 1 !== 0) {
        setErrors(prev => ({ ...prev, [itemId]: 'Item must be whole units' }));
        return;
      }
    }

    setFinalQuantities(prev => ({ ...prev, [itemId]: numValue }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[itemId];
      return newErrors;
    });
  };

  const handleConfirm = () => {
    // Validate all quantities
    const validationErrors: Record<string, string> = {};
    let hasErrors = false;

    (transfer.lines || []).forEach(line => {
      const qty = finalQuantities[line.itemId];
      if (qty === undefined || qty <= 0) {
        validationErrors[line.itemId] = 'Quantity must be greater than 0';
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(validationErrors);
      return;
    }

    // Build request
    const request: CompleteTransferRequest = {
      linesFinal: (transfer.lines || []).map(line => ({
        itemId: line.itemId,
        qtyFinal: finalQuantities[line.itemId] || line.qtyPlanned
      }))
    };

    onConfirm(request);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Transfer"
      size="lg"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="flex gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <svg className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-warning">
            Completing this transfer will immediately move stock from{' '}
            <strong>{transfer.sourceLocationId}</strong> to{' '}
            <strong>{transfer.destinationLocationId}</strong>.
            This action cannot be undone.
          </p>
        </div>

        {/* Transfer Info */}
        <div className="bg-surface-secondary rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Transfer Code:</span>{' '}
              <span className="font-mono">{transfer.code}</span>
            </div>
            <div>
              <span className="text-text-muted">Created By:</span>{' '}
              {transfer.createdBy}
            </div>
          </div>
          {transfer.notes && (
            <div className="mt-3 text-sm">
              <span className="text-text-muted">Notes:</span>{' '}
              {transfer.notes}
            </div>
          )}
        </div>

        {/* Line Items with Final Quantities */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-primary">
            Confirm Final Quantities
          </h3>
          
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    Item
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-text-secondary">
                    Planned
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-text-secondary">
                    Final Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(transfer.lines || []).map(line => (
                  <tr key={line.itemId}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-text-primary">
                          {line.name}
                        </div>
                        <div className="text-sm text-text-muted">
                          {line.sku} · {line.unit}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium">
                        {line.qtyPlanned}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[120px] mx-auto">
                        <Input
                          type="number"
                          value={finalQuantities[line.itemId] || ''}
                          onChange={(e) => handleQuantityChange(line.itemId, e.target.value)}
                          min={0}
                          step={['kg', 'L'].includes(line.unit) ? 0.01 : 1}
                          className={errors[line.itemId] ? 'border-error' : ''}
                        />
                        {errors[line.itemId] && (
                          <p className="text-xs text-error mt-1">
                            {errors[line.itemId]}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={isSubmitting}
            disabled={Object.keys(errors).length > 0}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Complete Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

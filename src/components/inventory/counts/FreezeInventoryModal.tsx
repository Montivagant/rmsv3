import React, { useState } from 'react';
import { Modal } from '../../Modal';
import { Button } from '../../Button';
import { useToast } from '../../../hooks/useToast';

interface FreezeInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  countId: string;
  remainingTime: string;
  isAdmin: boolean;
}

export default function FreezeInventoryModal({
  isOpen,
  onClose,
  onConfirm,
  countId,
  remainingTime,
  isAdmin
}: FreezeInventoryModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Here you would call the API to unfreeze inventory
      await fetch(`/api/inventory/counts/${countId}/unfreeze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminAction: true,
          reason: 'Manually unfrozen by admin'
        })
      });
      
      showToast({
        title: 'Inventory Unfrozen',
        description: 'The inventory has been successfully unfrozen.',
        variant: 'success'
      });
      
      onConfirm();
      onClose();
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to unfreeze inventory.',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unfreeze Inventory"
      size="sm"
    >
      <div className="p-6 space-y-4">
        <div className="flex justify-center mb-4">
          <div className="rounded-full w-16 h-16 bg-warning/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-text-primary mb-2">Confirm Inventory Unfreeze</h3>
          
          <p className="text-text-secondary mb-2">
            Inventory is currently frozen with <span className="font-mono font-medium">{remainingTime}</span> remaining.
          </p>
          
          <div className="bg-warning/10 border border-warning/20 rounded-md p-3 text-sm text-warning mb-4">
            <p>
              Unfreezing inventory will allow transactions to be processed immediately. 
              This may affect count accuracy if transactions occur during the count process.
            </p>
          </div>
          
          {!isAdmin && (
            <div className="bg-error/10 border border-error/20 rounded-md p-3 text-sm text-error mb-4">
              <p>
                <strong>Administrator privileges required.</strong> Please contact your administrator to unfreeze inventory.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !isAdmin}
            loading={isSubmitting}
          >
            Unfreeze Inventory
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import React from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmDialogProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="sm"
      hideCloseButton={isLoading}
    >
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${variant === 'destructive' 
              ? 'bg-error-100 dark:bg-error-900/30' 
              : 'bg-brand-100 dark:bg-brand-900/30'
            }
          `}>
            {variant === 'destructive' ? (
              <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {title}
            </h3>
            <p className="text-sm text-text-secondary">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-8">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            size="sm"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;

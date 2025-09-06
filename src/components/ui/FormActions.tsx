import React from 'react';
import { Button } from '../Button';
import { cn } from '../../lib/utils';

interface FormActionsProps {
  isVisible: boolean;
  isLoading?: boolean;
  isValid?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveText?: string;
  discardText?: string;
  className?: string;
}

/**
 * Sticky form actions bar that appears when form has unsaved changes
 * Similar to the StickyBar in settings but specifically for forms
 */
export function FormActions({
  isVisible,
  isLoading = false,
  isValid = true,
  onSave,
  onDiscard,
  saveText = 'Save Changes',
  discardText = 'Discard',
  className
}: FormActionsProps) {
  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-surface border-t border-border-primary shadow-lg',
        'transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : 'translate-y-full',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
            <span className="text-sm text-text-secondary">
              You have unsaved changes
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isLoading}
            >
              {discardText}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Saving...' : saveText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormActions;

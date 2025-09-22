import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../../components/Modal';

type DangerActionProps = {
  label: string;
  description?: string | React.ReactNode;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
  helpText?: string | React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export default function DangerAction({
  label,
  description,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  helpText,
  className,
  disabled = false,
}: DangerActionProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    try {
      setPending(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        type="button"
        className={cn('btn-base bg-error-100 text-error border border-error-600 hover:bg-error-50 focus-ring')}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {label}
      </button>
      {helpText ? (
        typeof helpText === 'string' ? (
          <p className="text-body-sm text-tertiary mt-1">{helpText}</p>
        ) : (
          <div className="text-body-sm text-tertiary mt-1">{helpText}</div>
        )
      ) : null}

      <Modal
        isOpen={open}
        onClose={() => (!pending ? setOpen(false) : undefined)}
        title="Confirm action"
        {...(typeof description === 'string' && { description })}
        size="md"
        showCloseButton={!pending}
      >
        {description && typeof description !== 'string' ? (
          <div className="text-body text-secondary mb-4">{description}</div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-base btn-outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn('btn-base btn-primary bg-error-600 hover:bg-error-700')}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </Modal>
    </div>
  );
}

import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { useDismissableLayer } from '../hooks/useDismissableLayer';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    isOpen, 
    onClose, 
    title, 
    description, 
    children, 
    className,
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    ...props 
  }, _ref) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const { layerRef } = useDismissableLayer({
      isOpen,
      onDismiss: onClose,
      closeOnOutside: closeOnOverlayClick,
      closeOnEscape,
      closeOnRouteChange: true,
    });

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full mx-4',
    };

    // Focus management
    useEffect(() => {
      if (isOpen) {
        // Store the previously focused element
        previousActiveElement.current = document.activeElement as HTMLElement;
        
        // Focus the modal after a brief delay to ensure it's rendered
        const timer = setTimeout(() => {
          modalRef.current?.focus();
        }, 0);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
          clearTimeout(timer);
        };
      } else {
        // Restore focus to the previously focused element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Focus trap (Tab handling) only
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
          );
          
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
      <div className="modal-backdrop">
        <div
          ref={(node) => { modalRef.current = node!; (layerRef as any).current = node; }}
          className={cn(
            'bg-surface rounded-lg shadow-lg z-modal max-h-[90vh] overflow-y-auto w-full',
            sizeClasses[size],
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-border">
              {title && (
                <h2 id="modal-title" className="text-h2 text-text-primary">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 text-text-tertiary hover:text-text-primary"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {description && (
            <p id="modal-description" className="sr-only">
              {description}
            </p>
          )}
          
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = 'Modal';

export { Modal };
export type { ModalProps };

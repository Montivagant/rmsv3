import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const Sheet = forwardRef<HTMLDivElement, SheetProps>(
  ({ 
    isOpen, 
    onClose, 
    title, 
    description, 
    children, 
    className,
    side = 'right',
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    ...props 
  }, _ref) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const sideClasses = {
      top: 'top-0 left-0 right-0 border-b',
      right: 'top-0 right-0 bottom-0 border-l',
      bottom: 'bottom-0 left-0 right-0 border-t',
      left: 'top-0 left-0 bottom-0 border-r',
    };

    const sizeClasses = {
      sm: side === 'top' || side === 'bottom' ? 'h-1/3' : 'w-80',
      md: side === 'top' || side === 'bottom' ? 'h-1/2' : 'w-96',
      lg: side === 'top' || side === 'bottom' ? 'h-2/3' : 'w-[32rem]',
      xl: side === 'top' || side === 'bottom' ? 'h-3/4' : 'w-[40rem]',
      full: side === 'top' || side === 'bottom' ? 'h-full' : 'w-full',
    };

    const animationClasses = {
      top: isOpen ? 'translate-y-0' : '-translate-y-full',
      right: isOpen ? 'translate-x-0' : 'translate-x-full',
      bottom: isOpen ? 'translate-y-0' : 'translate-y-full',
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
    };

    // Focus management
    useEffect(() => {
      if (isOpen) {
        // Store the previously focused element
        previousActiveElement.current = document.activeElement as HTMLElement;
        
        // Focus the sheet after a brief delay
        const timer = setTimeout(() => {
          sheetRef.current?.focus();
        }, 100);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('aria-hidden', 'true');

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
        document.body.removeAttribute('aria-hidden');
      }

      return () => {
        document.body.style.overflow = '';
        document.body.removeAttribute('aria-hidden');
      };
    }, [isOpen]);

    // Keyboard event handling
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && closeOnEscape) {
          event.preventDefault();
          onClose();
        }

        // Focus trap
        if (event.key === 'Tab') {
          const focusableElements = sheetRef.current?.querySelectorAll(
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
    }, [isOpen, onClose, closeOnEscape]);

    // Close on route change
    useEffect(() => {
      const handleRouteChange = () => {
        if (isOpen) {
          onClose();
        }
      };

      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sheetContent = (
      <div className="fixed inset-0 z-modal-backdrop">
        {/* Backdrop */}
        <div 
          className={cn(
            'modal-backdrop transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
        
        {/* Sheet */}
        <div
          ref={sheetRef}
          className={cn(
            'fixed bg-surface shadow-lg z-modal transition-transform duration-300 ease-in-out',
            'flex flex-col',
            sideClasses[side],
            sizeClasses[size],
            animationClasses[side],
            'border-border-primary',
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'sheet-title' : undefined}
          aria-describedby={description ? 'sheet-description' : undefined}
          tabIndex={-1}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-border-secondary">
              {title && (
                <h2 id="sheet-title" className="text-h2 text-text-primary">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 text-text-tertiary hover:text-text-primary"
                  onClick={onClose}
                  aria-label="Close sheet"
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
            <p id="sheet-description" className="sr-only">
              {description}
            </p>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    );

    return createPortal(sheetContent, document.body);
  }
);

Sheet.displayName = 'Sheet';

export { Sheet };
export type { SheetProps };

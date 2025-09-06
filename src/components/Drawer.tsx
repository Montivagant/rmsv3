import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { useDismissableLayer } from '../hooks/useDismissableLayer';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
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
    ...props 
  }, _ref) => {
    const drawerRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const { layerRef } = useDismissableLayer({
      isOpen,
      onDismiss: onClose,
      closeOnOutside: closeOnOverlayClick,
      closeOnEscape,
      closeOnRouteChange: true,
    });

    const sideClasses = {
      left: 'drawer-left',
      right: 'drawer-right',
      top: 'drawer-top',
      bottom: 'drawer-bottom',
    };

    const sizeClasses = {
      sm: side === 'left' || side === 'right' ? 'w-80' : 'h-80',
      md: side === 'left' || side === 'right' ? 'w-96' : 'h-96',
      lg: side === 'left' || side === 'right' ? 'w-[32rem]' : 'h-[32rem]',
      xl: side === 'left' || side === 'right' ? 'w-[40rem]' : 'h-[40rem]',
      full: side === 'left' || side === 'right' ? 'w-full' : 'h-full',
    };

    // Focus management
    useEffect(() => {
      if (isOpen) {
        // Store the previously focused element
        previousActiveElement.current = document.activeElement as HTMLElement;
        
        // Focus the drawer
        setTimeout(() => {
          drawerRef.current?.focus();
        }, 0);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
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

    // Keyboard event handling (focus trap only)
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = drawerRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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

    const drawerContent = (
      <div className="drawer-backdrop" style={{ zIndex: 'var(--z-modal-backdrop)' }}>
        <div className="drawer-overlay">
          <div
            ref={(node) => { drawerRef.current = node!; (layerRef as any).current = node; }}
            className={cn(
              'drawer-content',
              sideClasses[side],
              sizeClasses[size],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            aria-describedby={description ? 'drawer-description' : undefined}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {title && (
              <div className="drawer-header">
                <h2 id="drawer-title" className="drawer-title">
                  {title}
                </h2>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={onClose}
                  aria-label="Close drawer"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
            
            {description && (
              <p id="drawer-description" className="drawer-description sr-only">
                {description}
              </p>
            )}
            
            <div className="drawer-body">
              {children}
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(drawerContent, document.body);
  }
);

Drawer.displayName = 'Drawer';

export { Drawer };

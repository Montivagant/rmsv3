import { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';

interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ 
    id, 
    title, 
    message, 
    variant = 'default', 
    duration = 5000, 
    onClose, 
    action,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const variantClasses = {
      default: 'toast-default',
      success: 'toast-success',
      warning: 'toast-warning',
      error: 'toast-error',
    };

    const variantIcons = {
      default: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      error: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    useEffect(() => {
      // Animate in
      setIsVisible(true);

      // Auto-dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }, [duration]);

    const handleClose = () => {
      setIsExiting(true);
      setTimeout(() => {
        onClose(id);
      }, 200); // Match animation duration
    };

    const toastContent = (
      <div
        ref={ref}
        className={cn(
          'toast-base',
          variantClasses[variant],
          isVisible && !isExiting && 'animate-fade-in animate-slide-up',
          isExiting && 'animate-fade-out',
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        <div className="toast-icon">
          {variantIcons[variant]}
        </div>
        
        <div className="toast-content">
          {title && (
            <div className="toast-title">
              {title}
            </div>
          )}
          <div className="toast-message">
            {message}
          </div>
        </div>

        <div className="toast-actions">
          {action && (
            <button
              type="button"
              className="toast-action"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            className="toast-close"
            onClick={handleClose}
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );

    return createPortal(toastContent, document.body);
  }
);

Toast.displayName = 'Toast';

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastContainer = ({ toasts, position = 'top-right' }: ToastContainerProps) => {
  const positionClasses = {
    'top-right': 'toast-container-top-right',
    'top-left': 'toast-container-top-left',
    'bottom-right': 'toast-container-bottom-right',
    'bottom-left': 'toast-container-bottom-left',
    'top-center': 'toast-container-top-center',
    'bottom-center': 'toast-container-bottom-center',
  };

  if (toasts.length === 0) return null;

  const containerContent = (
    <div className={cn('toast-container', positionClasses[position])}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );

  return createPortal(containerContent, document.body);
};

export { Toast, ToastContainer };

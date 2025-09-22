// Enhanced Toast Hook
// Wraps the existing toast system with additional functionality
import { useToast as useBaseToast } from '../components/Toast';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
  persistent?: boolean;
}

export interface ToastMessage {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  persistent?: boolean;
}

/**
 * Enhanced useToast hook that provides type-safe toast functionality
 * Wraps the base toast system with additional variants and options
 */
export function useToast() {
  let baseToast: { show: (msg: string) => void; clear: () => void };
  try {
    baseToast = useBaseToast();
  } catch {
    // Provide a safe fallback for environments without ToastProvider (e.g., tests)
    baseToast = {
      show: () => {},
      clear: () => {},
    } as any;
  }

  // Overloaded function to support both signatures
  function showToast(message: string, variant?: ToastVariant, options?: ToastOptions): void;
  function showToast(messageObj: ToastMessage): void;
  function showToast(
    messageOrObj: string | ToastMessage, 
    variant: ToastVariant = 'info', 
    _options: ToastOptions = {}
  ): void {
    let message: string;
    
    if (typeof messageOrObj === 'string') {
      // Old signature: showToast('message', 'variant')
      message = messageOrObj;
    } else {
      // New signature: showToast({title, description, variant})
      const { title, description } = messageOrObj;
      message = title ? (description ? `${title}: ${description}` : title) : (description || '');
      variant = messageOrObj.variant || variant;
    }
    
    // For now, use the simple toast system
    // In a full implementation, this would handle different variants with styling
    baseToast.show(message);
  }

  const showSuccess = (message: string, options?: ToastOptions) => {
    showToast(message, 'success', options);
  };

  const showError = (message: string, options?: ToastOptions) => {
    showToast(message, 'error', options);
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    showToast(message, 'warning', options);
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    showToast(message, 'info', options);
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll: baseToast.clear
  };
}

// Unsaved Changes Guard Hook
import { useEffect, useRef } from 'react';

export interface UnsavedGuardOptions {
  when: boolean;
  message?: string;
  onBeforeUnload?: () => boolean | string;
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Are you sure you want to leave this page?';

/**
 * Hook to prevent navigation away from page when there are unsaved changes
 * Handles browser navigation (refresh, close tab, etc.)
 * Note: React Router navigation blocking requires data router APIs
 */
export function useUnsavedGuard({
  when,
  message = DEFAULT_MESSAGE,
  onBeforeUnload,
}: UnsavedGuardOptions) {
  const messageRef = useRef(message);
  messageRef.current = message;

  // Handle browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (onBeforeUnload) {
        const result = onBeforeUnload();
        if (result === false) return;
        if (typeof result === 'string') {
          event.returnValue = result;
          return result;
        }
      }
      
      event.returnValue = messageRef.current;
      return messageRef.current;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when, onBeforeUnload]);

  // TODO: React Router navigation blocking requires upgrading to createBrowserRouter
  // For now, only browser navigation (refresh, close tab) is protected

  return {
    isBlocked: false,
    proceed: () => {},
    reset: () => {},
  };
}

/**
 * Simplified version for basic form protection
 */
export function useFormGuard(isDirty: boolean, message?: string) {
  return useUnsavedGuard({
    when: isDirty,
    ...(message !== undefined && { message }),
  });
}

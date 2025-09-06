import { useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

export interface UseDismissableLayerOptions {
  isOpen: boolean;
  onDismiss: () => void;
  closeOnOutside?: boolean;
  closeOnEscape?: boolean;
  closeOnRouteChange?: boolean;
  closeOnBlur?: boolean;
  /**
   * Optional trigger ref. If provided, clicks within this element are treated as inside the layer.
   * Useful for menu buttons or toggles that control the layer.
   */
  triggerRef?: RefObject<HTMLElement>;
  /**
   * Unique id for coordinating with other overlays. If not provided, a random id will be generated.
   */
  id?: string;
  /**
   * If true, when this layer opens it will signal other open overlays to close.
   */
  closeOthersOnOpen?: boolean;
}

/**
 * useDismissableLayer
 * Reusable outside click + Escape + route change + optional blur dismiss behavior for overlays.
 * - One overlay at a time: dispatches 'overlay:open' and listens to it to close others.
 * - Returns a ref to attach to the overlay root and an optional onBlur handler.
 */
export function useDismissableLayer(options: UseDismissableLayerOptions) {
  const {
    isOpen,
    onDismiss,
    closeOnOutside = true,
    closeOnEscape = true,
    closeOnRouteChange = true,
    closeOnBlur = false,
    triggerRef,
    id,
    closeOthersOnOpen = true,
  } = options;

  const layerRef = useRef<HTMLElement | null>(null);
  const overlayIdRef = useRef<string>(id || `overlay-${Math.random().toString(36).slice(2)}`);

  const handleOutsideMouseDown = useCallback((event: MouseEvent) => {
    if (!closeOnOutside) return;
    const target = event.target as Node | null;
    const layerEl = layerRef.current;
    if (!layerEl) return;

    const clickedInsideLayer = layerEl.contains(target);
    const clickedOnTrigger = triggerRef?.current ? triggerRef.current.contains(target as Node) : false;

    if (!clickedInsideLayer && !clickedOnTrigger) {
      onDismiss();
    }
  }, [closeOnOutside, onDismiss, triggerRef]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!closeOnEscape) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onDismiss();
    }
  }, [closeOnEscape, onDismiss]);

  const handleRouteChange = useCallback(() => {
    if (!closeOnRouteChange) return;
    onDismiss();
  }, [closeOnRouteChange, onDismiss]);

  const handleOverlayOpenEvent = useCallback((e: Event) => {
    // Close if another overlay announces opening
    const custom = e as CustomEvent<{ id: string }>;
    const incomingId = custom.detail?.id;
    if (!incomingId) return;
    if (incomingId !== overlayIdRef.current && isOpen) {
      onDismiss();
    }
  }, [isOpen, onDismiss]);

  // Blur handler: if focus moves outside the layer, dismiss
  const onBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (!closeOnBlur) return;
    const next = e.relatedTarget as Node | null;
    const layerEl = layerRef.current;
    if (!layerEl) return;

    // If focus is leaving to an element outside of the layer and not the trigger, dismiss
    const movingToTrigger = triggerRef?.current ? triggerRef.current.contains(next as Node) : false;
    const movingInsideLayer = next ? layerEl.contains(next) : false;

    if (!movingInsideLayer && !movingToTrigger) {
      onDismiss();
    }
  }, [closeOnBlur, onDismiss, triggerRef]);

  // Manage global event listeners while open
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('mousedown', handleOutsideMouseDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    if (closeOnRouteChange) {
      window.addEventListener('popstate', handleRouteChange);
    }

    // One-overlay-at-a-time coordination
    window.addEventListener('overlay:open', handleOverlayOpenEvent as EventListener);

    // Announce opening to others
    if (closeOthersOnOpen) {
      const evt = new CustomEvent('overlay:open', { detail: { id: overlayIdRef.current } });
      window.dispatchEvent(evt);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (closeOnRouteChange) {
        window.removeEventListener('popstate', handleRouteChange);
      }
      window.removeEventListener('overlay:open', handleOverlayOpenEvent as EventListener);
    };
  }, [
    isOpen,
    handleOutsideMouseDown,
    handleKeyDown,
    handleRouteChange,
    handleOverlayOpenEvent,
    closeOnRouteChange,
    closeOthersOnOpen,
  ]);

  return {
    layerRef,
    onBlur,
  };
}

export type UseDismissableLayerReturn = ReturnType<typeof useDismissableLayer>;

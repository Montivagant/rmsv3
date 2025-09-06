import React, { useEffect } from 'react';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { Sidebar } from './Sidebar';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  onNewAction?: (actionType: string) => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  userRole = 'staff',
  onNewAction,
}) => {
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Dismissible layer behavior
  const { layerRef } = useDismissableLayer({
    isOpen,
    onDismiss: onClose,
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    id: 'mobile-nav-drawer',
    closeOthersOnOpen: true,
  });

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={(node) => {
          drawerRef.current = node!;
          (layerRef as any).current = node;
        }}
        className="
          fixed inset-y-0 left-0 w-80 max-w-xs
          bg-surface border-r border-border-primary
          shadow-xl
          transform transition-transform duration-300 ease-in-out
          translate-x-0
        "
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-secondary">
          <h2 className="text-lg font-semibold text-text-primary">Navigation</h2>
          <button
            onClick={onClose}
            className="
              p-2 rounded-md text-text-secondary hover:bg-surface-secondary
              focus-ring
            "
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar content */}
        <div className="h-full overflow-hidden">
          <Sidebar
            userRole={userRole}
            collapsed={false}
            onNewAction={(actionType) => {
              onNewAction?.(actionType);
              onClose(); // Close drawer after action
            }}
            className="h-full border-r-0"
          />
        </div>
      </div>
    </div>
  );
};

export default MobileNavDrawer;

import React, { useState, useRef, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom'; // Unused for now
import { useFeature } from '../../store/flags';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import type { QuickAction } from '../../config/nav.config';
import { 
  navigationConfig, 
  quickActionsConfig,
  filterNavItemsByRole,
  filterQuickActionsByRole
} from '../../config/nav.config';
import { NavSection } from './NavSection';
import { NavIcon } from './NavIcon';

interface SidebarProps {
  userRole?: string;
  collapsed?: boolean;
  onNewAction?: (actionType: string) => void;
  className?: string;
}

// Storage key for expanded sections
const EXPANDED_SECTIONS_STORAGE_KEY = 'rms-nav-expanded-sections';

export const Sidebar: React.FC<SidebarProps> = ({
  userRole = 'staff',
  collapsed = false,
  onNewAction,
  className = '',
}) => {
  // const navigate = useNavigate(); // Unused for now
  const sidebarRef = useRef<HTMLElement>(null);
  const quickActionsTriggerRef = useRef<HTMLButtonElement>(null);
  const quickActionsPanelRef = useRef<HTMLDivElement>(null);
  
  // Feature flags
  const kdsEnabled = useFeature('kds');
  
  // Quick actions state
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Expanded sections state with localStorage persistence
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_SECTIONS_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set(['orders', 'inventory']);
    } catch {
      return new Set(['orders', 'inventory']);
    }
  });

  // Persist expanded sections
  useEffect(() => {
    try {
      localStorage.setItem(
        EXPANDED_SECTIONS_STORAGE_KEY, 
        JSON.stringify(Array.from(expandedSections))
      );
    } catch {
      // Silent fail for localStorage issues
    }
  }, [expandedSections]);

  // Dismissible layer for quick actions
  const { layerRef: quickActionsLayerRef } = useDismissableLayer({
    isOpen: showQuickActions,
    onDismiss: () => setShowQuickActions(false),
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: quickActionsTriggerRef,
    id: 'sidebar-quick-actions',
    closeOthersOnOpen: true,
  });

  // Filter navigation items and quick actions by role
  const filteredNavItems = filterNavItemsByRole(navigationConfig, userRole);
  const filteredQuickActions = filterQuickActionsByRole(quickActionsConfig, userRole);

  // Apply feature flags and hide stubs
  const finalNavItems = filteredNavItems
    .map(item => {
      const children = item.children?.filter(child => {
        if (child.stub) return false;
        if (child.featureFlag === 'kds') return kdsEnabled;
        return true;
      });
      return { ...item, children };
    })
    .filter(item => !item.stub);

  // Toggle section expansion
  const handleToggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Handle quick action selection
  const handleQuickAction = useCallback((action: QuickAction) => {
    onNewAction?.(action.actionType);
    setShowQuickActions(false);
  }, [onNewAction]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sidebarRef.current || document.activeElement?.closest('nav') !== sidebarRef.current) {
        return;
      }

      const navItems = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button[data-nav-item="true"]'
      );
      const currentIndex = Array.from(navItems).indexOf(document.activeElement as HTMLElement);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
          navItems[nextIndex]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
          navItems[prevIndex]?.focus();
          break;
        case 'Home':
          e.preventDefault();
          navItems[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          navItems[navItems.length - 1]?.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <nav
      ref={sidebarRef}
      className={`
        flex flex-col h-full
        bg-surface border-r border-border-primary
        transition-all duration-300 ease-in-out
        overflow-visible z-40
        ${className}
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo/Brand */}
      <div className={`
        flex items-center border-b border-border-secondary
        ${collapsed ? 'justify-center px-4 py-4' : 'justify-between px-4 py-4'}
      `}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-inverse font-bold text-lg">R</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-text-primary">RMS v3</span>
          )}
        </div>
      </div>

      {/* Quick Action Button */}
      <div className={`border-b border-border-secondary ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
        <div className="relative">
          <button
            ref={quickActionsTriggerRef}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`
              ${collapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full'}
              btn-base btn-primary
              flex items-center space-x-2
              focus-ring
            `}
            aria-expanded={showQuickActions}
            aria-haspopup="menu"
            title="Quick actions"
            data-nav-item="true"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className={collapsed ? 'sr-only' : ''}>New</span>
          </button>
          
          {/* Quick Actions Menu */}
          {showQuickActions && (
            <div
              ref={(node) => {
                quickActionsPanelRef.current = node!;
                (quickActionsLayerRef as any).current = node;
              }}
              className={`
                absolute z-50 mt-2
                ${collapsed ? 'left-full ml-2 top-0 w-56' : 'left-0 right-0'}
                bg-surface rounded-lg shadow-lg border border-border-primary
                animate-fade-in
              `}
              role="menu"
              aria-orientation="vertical"
              aria-label="Quick actions"
            >
              {filteredQuickActions.map(action => (
                <button
                  key={action.id}
                  role="menuitem"
                  onClick={() => handleQuickAction(action)}
                  className="
                    w-full flex items-center space-x-3 px-4 py-3
                    text-sm text-text-secondary hover:bg-surface-secondary
                    first:rounded-t-lg last:rounded-b-lg
                    transition-colors duration-200
                    focus-ring
                  "
                >
                  <span className="flex-shrink-0 text-current">
                    <NavIcon path={action.icon} />
                  </span>
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className={`
        flex-1 overflow-y-auto scrollbar-thin
        ${collapsed ? 'px-2' : 'px-4'}
        py-4 space-y-2
      `}>
        {finalNavItems.map(item => (
          <NavSection
            key={item.id}
            item={item}
            collapsed={collapsed}
            expandedSections={expandedSections}
            onToggleSection={handleToggleSection}
          />
        ))}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border-secondary">
          <div className="text-xs text-text-tertiary">
            Role: <span className="font-medium capitalize text-text-secondary">
              {userRole.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;

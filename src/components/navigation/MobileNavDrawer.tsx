import React, { useCallback, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { NavIcon } from './NavIcon';
import {
  navigationConfig,
  filterNavItemsByRole,
} from '../../config/nav.config';
import type { NavItem } from '../../config/nav.config';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

interface MobileNavItemProps {
  item: NavItem;
  onNavigate: () => void;
  depth?: number;
}

interface MobileNavGroupProps {
  item: NavItem;
  onNavigate: () => void;
  depth?: number;
}

// Mobile navigation item component
const MobileNavItem: React.FC<MobileNavItemProps> = ({ item, onNavigate, depth = 0 }) => {
  const location = useLocation();
  const isActive = item.path ? location.pathname === item.path : false;

  if (!item.path) return null;

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={({ isActive: linkActive }) => `
        group flex items-center justify-between
        px-4 py-3 text-base font-medium
        ${depth > 0 ? 'ml-8' : ''}
        rounded-md transition-colors duration-200
        focus-ring
        ${linkActive || isActive
          ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-400'
          : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        {item.icon && (
          <span className="flex-shrink-0 text-current">
            <NavIcon path={item.icon} />
          </span>
        )}
        <span className="truncate">{item.label}</span>
      </div>
    </NavLink>
  );
};

const MobileNavGroup: React.FC<MobileNavGroupProps> = ({ item, onNavigate, depth = 0 }) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveChild = useCallback((navItem: NavItem): boolean => {
    if (navItem.path && location.pathname === navItem.path) {
      return true;
    }
    if (navItem.children) {
      return navItem.children.some((child: NavItem) => hasActiveChild(child));
    }
    return false;
  }, [location.pathname]);

  // If no children, render as single item
  if (!item.children || item.children.length === 0) {
    return <MobileNavItem item={item} onNavigate={onNavigate} depth={depth} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`mobile-nav-group-${item.id}`}
        className={`
          group w-full flex items-center justify-between
          px-4 py-3 text-base font-medium
          ${depth > 0 ? 'ml-8' : ''}
          rounded-md transition-colors duration-200
          focus-ring
          ${hasActiveChild(item)
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
            : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
          }
        `}
      >
        <div className="flex items-center space-x-3">
          {item.icon && (
            <span className="flex-shrink-0 text-current">
              <NavIcon path={item.icon} />
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </div>
        
        {/* Chevron indicator */}
        {item.children && (
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {isExpanded && item.children && (
        <div
          id={`mobile-nav-group-${item.id}`}
          className="ml-4 pl-4 border-l border-border-secondary space-y-1"
          role="group"
          aria-labelledby={`mobile-nav-header-${item.id}`}
        >
          {item.children.map((child: NavItem) => (
            <MobileNavGroup
              key={child.id}
              item={child}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  userRole,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const { layerRef } = useDismissableLayer({ isOpen, onDismiss: onClose, closeOnOutside: true, closeOnEscape: true, closeOnRouteChange: true });

  const filteredNavItems = filterNavItemsByRole(navigationConfig, userRole);

  return (
    <div
      ref={(node) => { drawerRef.current = node!; (layerRef as any).current = node; }}
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-surface transform transition-transform duration-300 ease-in-out lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-title"
    >
      <div className="flex items-center justify-between p-4 border-b border-border-secondary">
        <h2 id="mobile-nav-title" className="text-lg font-semibold">
          Menu
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-md hover:bg-surface-secondary focus-ring"
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 px-2 py-4 space-y-2"
      >
        {filteredNavItems.map((item: NavItem) => (
          <MobileNavGroup key={item.id} item={item} onNavigate={onClose} />
        ))}
      </nav>
      <div className="p-4 border-t border-border-secondary">
        {/* Add footer content if needed */}
      </div>
    </div>
  );
};

export default MobileNavDrawer;

import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { NavIcon } from './NavIcon';
import { adminNavConfig, filterAdminNavByRole, getExpandedSections, saveExpandedSections } from '../../config/admin-nav.config';
import type { AdminNavItem } from '../../config/admin-nav.config';

interface AdminMobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

interface MobileAdminNavItemProps {
  item: AdminNavItem;
  onItemClick: () => void;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  depth?: number;
}

// Mobile admin navigation item component
const MobileAdminNavItem: React.FC<MobileAdminNavItemProps> = ({ 
  item, 
  onItemClick, 
  expandedSections, 
  onToggleSection,
  depth = 0 
}) => {
  const location = useLocation();
  const isActive = item.path ? location.pathname === item.path : false;
  const isExpanded = item.persistKey ? expandedSections.has(item.persistKey) : true;
  
  // If no children, render as navigation link
  if (!item.children || item.children.length === 0) {
    if (item.path) {
      return (
        <NavLink
          to={item.path}
          onClick={onItemClick}
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
    }
    
    // Non-interactive item (nested group label)
    return (
      <div className={`
        flex items-center px-4 py-3 text-base font-medium text-text-tertiary
        ${depth > 0 ? 'ml-8' : ''}
      `}>
        <div className="flex items-center space-x-3">
          {item.icon && (
            <span className="flex-shrink-0 text-current">
              <NavIcon path={item.icon} />
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </div>
      </div>
    );
  }

  // Render as collapsible group
  const handleToggle = () => {
    if (item.persistKey) {
      onToggleSection(item.persistKey);
    }
  };

  return (
    <div className="space-y-1">
      {/* Group header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={item.persistKey ? `mobile-nav-group-${item.persistKey}` : undefined}
        className={`
          group w-full flex items-center justify-between
          px-4 py-3 text-base font-medium
          ${depth > 0 ? 'ml-8' : ''}
          rounded-md transition-colors duration-200
          focus-ring
          ${isActive
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
        {item.persistKey && (
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </button>

      {/* Group content */}
      {isExpanded && item.children && (
        <div
          id={item.persistKey ? `mobile-nav-group-${item.persistKey}` : undefined}
          className="space-y-1"
          role="group"
        >
          {item.children.map(child => (
            <MobileAdminNavItem
              key={child.id}
              item={child}
              onItemClick={onItemClick}
              expandedSections={expandedSections}
              onToggleSection={onToggleSection}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminMobileNavDrawer: React.FC<AdminMobileNavDrawerProps> = ({
  isOpen,
  onClose,
  userRole = 'admin',
}) => {
  // drawerRef will be provided by useDismissableLayer
  const [expandedSections, setExpandedSections] = useState<Set<string>>(getExpandedSections);
  
  // Filter navigation items by user role
  const filteredNavItems = filterAdminNavByRole(adminNavConfig, userRole);

  // Toggle section expansion
  const handleToggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      saveExpandedSections(next);
      return next;
    });
  };

  // Set up dismissable layer
  const { layerRef } = useDismissableLayer({
    isOpen,
    onDismiss: onClose,
  });

  // Use the returned layerRef or merge it with drawerRef
  const drawerRef = layerRef as React.RefObject<HTMLDivElement>;

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="drawer-backdrop z-modal-backdrop lg:hidden"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 left-0 w-80 max-w-full bg-surface border-r border-border-primary shadow-xl z-modal lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation menu"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border-secondary">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-inverse font-bold text-lg">D</span>
              </div>
              <span className="text-lg font-semibold text-text-primary">DashUp</span>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-secondary hover:bg-surface-secondary rounded-md transition-colors focus-ring"
              aria-label="Close navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {filteredNavItems.map(item => (
              <MobileAdminNavItem
                key={item.id}
                item={item}
                onItemClick={onClose}
                expandedSections={expandedSections}
                onToggleSection={handleToggleSection}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border-secondary">
            <div className="text-xs text-text-tertiary">
              Role: <span className="font-medium capitalize text-text-secondary">
                {userRole.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminMobileNavDrawer;

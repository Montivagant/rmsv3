import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { NavIcon } from './NavIcon';
import { adminNavConfig, filterAdminNavByRole, getExpandedSections, saveExpandedSections } from '../../config/admin-nav.config';
import type { AdminNavItem } from '../../config/admin-nav.config';

interface AdminSidebarProps {
  userRole?: string;
  collapsed?: boolean;
  className?: string;
}

interface AdminNavGroupProps {
  item: AdminNavItem;
  collapsed: boolean;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  depth?: number;
}

interface AdminNavItemProps {
  item: AdminNavItem;
  collapsed: boolean;
  depth?: number;
  onClick?: () => void;
}

// Individual navigation item component
const AdminNavItemComponent: React.FC<AdminNavItemProps> = ({ 
  item, 
  collapsed, 
  depth = 0, 
  onClick 
}) => {
  const location = useLocation();
  const isActive = item.path ? location.pathname === item.path : false;

  if (item.path) {
    // Render as navigation link
    return (
      <NavLink
        to={item.path}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={({ isActive: linkActive }) => `
          group flex items-center
          ${collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'}
          ${depth > 0 ? 'ml-6' : ''}
          text-sm font-medium
          rounded-md
          transition-all duration-200 ease-in-out
          focus-ring
          ${linkActive || isActive
            ? 'bg-brand-50 text-brand-700 border-l-2 border-brand-600 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-400'
            : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
          }
        `}
      >
        <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
          {item.icon && (
            <span className="flex-shrink-0 text-current">
              <NavIcon path={item.icon} />
            </span>
          )}
          <span className={collapsed ? 'sr-only' : 'truncate'}>
            {item.label}
          </span>
        </div>
      </NavLink>
    );
  }

  // Render as non-interactive label (for nested groups)
  return (
    <div 
      className={`
        flex items-center
        ${collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'}
        ${depth > 0 ? 'ml-6' : ''}
        text-sm font-medium text-text-tertiary
      `}
    >
      <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
        {item.icon && (
          <span className="flex-shrink-0 text-current">
            <NavIcon path={item.icon} />
          </span>
        )}
        <span className={collapsed ? 'sr-only' : 'truncate'}>
          {item.label}
        </span>
      </div>
    </div>
  );
};

// Navigation group component (collapsible sections)
const AdminNavGroup: React.FC<AdminNavGroupProps> = ({
  item,
  collapsed,
  expandedSections,
  onToggleSection,
  depth = 0,
}) => {
  const location = useLocation();
  
  // Check if any child is active
  const hasActiveChild = useCallback((navItem: AdminNavItem): boolean => {
    if (navItem.path && location.pathname === navItem.path) {
      return true;
    }
    if (navItem.children) {
      return navItem.children.some(child => hasActiveChild(child));
    }
    return false;
  }, [location.pathname]);

  const isExpanded = item.persistKey ? expandedSections.has(item.persistKey) : true;
  const hasActive = hasActiveChild(item);

  // Auto-expand sections with active children
  useEffect(() => {
    if (hasActive && item.persistKey && !isExpanded) {
      onToggleSection(item.persistKey);
    }
  }, [hasActive, item.persistKey, isExpanded, onToggleSection]);

  // If no children, render as single item
  if (!item.children || item.children.length === 0) {
    return <AdminNavItemComponent item={item} collapsed={collapsed} depth={depth} />;
  }

  const handleToggle = () => {
    if (item.persistKey && !collapsed) {
      onToggleSection(item.persistKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleToggle();
        break;
      case 'ArrowRight':
        if (!isExpanded && item.persistKey) {
          e.preventDefault();
          onToggleSection(item.persistKey);
        }
        break;
      case 'ArrowLeft':
        if (isExpanded && item.persistKey) {
          e.preventDefault();
          onToggleSection(item.persistKey);
        }
        break;
    }
  };

  return (
    <div className="space-y-1">
      {/* Group header */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={collapsed ? false : isExpanded}
        aria-controls={item.persistKey ? `nav-group-${item.persistKey}` : undefined}
        title={collapsed ? item.label : undefined}
        className={`
          group w-full flex items-center
          ${collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'}
          ${depth > 0 ? 'ml-6' : ''}
          text-sm font-medium
          rounded-md
          transition-all duration-200 ease-in-out
          focus-ring
          ${hasActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
            : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
          }
        `}
      >
        <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
          {item.icon && (
            <span className="flex-shrink-0 text-current">
              <NavIcon path={item.icon} />
            </span>
          )}
          <span className={collapsed ? 'sr-only' : 'truncate'}>
            {item.label}
          </span>
        </div>
        
        {/* Chevron indicator */}
        {!collapsed && item.persistKey && (
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
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
      {!collapsed && isExpanded && item.children && (
        <div
          id={item.persistKey ? `nav-group-${item.persistKey}` : undefined}
          className="ml-8 space-y-1"
          role="group"
          aria-labelledby={item.persistKey ? `nav-group-header-${item.persistKey}` : undefined}
        >
          {item.children.map(child => (
            <AdminNavGroup
              key={child.id}
              item={child}
              collapsed={collapsed}
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

// Main admin sidebar component
export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  userRole = 'business_owner',
  collapsed = false,
  className = '',
}) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(getExpandedSections);

  // Filter navigation items by user role
  const filteredNavItems = filterAdminNavByRole(adminNavConfig, userRole);

  // Toggle section expansion
  const handleToggleSection = useCallback((sectionId: string) => {
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
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sidebarRef.current || document.activeElement?.closest('nav') !== sidebarRef.current) {
        return;
      }

      const navItems = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button[aria-expanded]'
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
      aria-label="Admin navigation"
    >
      {/* Logo/Brand */}
      <div className={`
        flex items-center border-b border-border-secondary
        ${collapsed ? 'justify-center px-4 py-4' : 'justify-between px-4 py-4'}
      `}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-text-primary">DashUp</span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className={`
        flex-1 overflow-y-auto scrollbar-thin
        ${collapsed ? 'px-2' : 'px-4'}
        py-4 space-y-2
      `}>
        {filteredNavItems.map(item => (
          <AdminNavGroup
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

export default AdminSidebar;

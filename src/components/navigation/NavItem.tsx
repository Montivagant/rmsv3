import React from 'react';
import { NavLink } from 'react-router-dom';
import type { NavItem as NavItemType } from '../../config/nav.config';
import { NavigationBadge } from './NavigationBadge';
import { NavIcon } from './NavIcon';

interface NavItemProps {
  item: NavItemType;
  collapsed?: boolean;
  depth?: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  item,
  collapsed = false,
  depth = 0,
  isActive = false,
  onClick,
  className = '',
}) => {
  // If item has a path, render as NavLink
  if (item.path) {
    return (
      <NavLink
        to={item.path}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        className={({ isActive: linkActive }) => `
          group flex items-center
          ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}
          ${depth > 0 ? 'ml-6' : ''}
          py-2.5
          text-sm font-medium
          rounded-md
          transition-all duration-200 ease-in-out
          focus-ring
          ${linkActive || isActive
            ? 'bg-brand-50 text-brand-700 border-l-2 border-brand-600 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-400'
            : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
          }
          ${className}
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

        {/* Badge */}
        {!collapsed && item.badgeId && (
          <NavigationBadge badgeId={item.badgeId} className="ml-auto flex-shrink-0" />
        )}
      </NavLink>
    );
  }

  // If no path, render as button for expandable groups
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center
        ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}
        ${depth > 0 ? 'ml-6' : ''}
        py-2.5 w-full
        text-sm font-medium text-left
        rounded-md
        transition-all duration-200 ease-in-out
        focus-ring
        ${isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
          : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
        }
        ${className}
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

      {/* Badge and chevron */}
      {!collapsed && (
        <div className="flex items-center space-x-2 ml-auto">
          {item.badgeId && (
            <NavigationBadge badgeId={item.badgeId} />
          )}
          {item.children && (
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isActive ? 'rotate-90' : ''
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
        </div>
      )}
    </button>
  );
};

export default NavItem;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../rbac/roles';
import {
  navigationConfig,
  filterNavItemsByRole,
  generateBreadcrumbs,
  getPageTitle
} from '../../config/nav.config';

interface NavigationBreadcrumbProps {
  className?: string;
}

export const NavigationBreadcrumb: React.FC<NavigationBreadcrumbProps> = ({
  className = ''
}) => {
  const location = useLocation();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role.toLowerCase() || 'business_owner';

  // Filter navigation items by role to use in breadcrumb generation
  const filteredNavItems = filterNavItemsByRole(navigationConfig, userRole);
  const breadcrumbs = generateBreadcrumbs(location.pathname, filteredNavItems);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className={`text-sm font-medium ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/dashboard" className="text-text-tertiary hover:text-text-primary transition-colors duration-200 focus-ring rounded-md p-1 -m-1">
            Home
          </Link>
        </li>
        {breadcrumbs.map((breadcrumb: { label: string; path?: string }, index: number) => (
          <li key={index} className="flex items-center">
            <svg
              className="flex-shrink-0 h-5 w-5 text-text-quaternary mx-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5.555 17.776l8-16 .267.667-8 16-.267-.667z" />
            </svg>
            {breadcrumb.path ? (
              <Link
                to={breadcrumb.path}
                className="text-text-tertiary hover:text-text-primary transition-colors duration-200 focus-ring rounded-md p-1 -m-1"
              >
                {breadcrumb.label}
              </Link>
            ) : (
              <span className="text-text-primary">{breadcrumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Hook to get current page title from navigation config
export const usePageTitle = (): string => {
  const location = useLocation();
  const currentUser = getCurrentUser();
  
  const userRole = currentUser?.role || 'staff';
  const filteredNavItems = filterNavItemsByRole(navigationConfig, userRole);
  
  return getPageTitle(location.pathname, filteredNavItems);
};

export default NavigationBreadcrumb;

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
  
  // Get user role for filtering navigation
  const userRole = currentUser?.role || 'staff';
  
  // Get filtered navigation items for current user
  const filteredNavItems = filterNavItemsByRole(navigationConfig, userRole);
  
  // Generate breadcrumbs from current path
  const breadcrumbs = generateBreadcrumbs(location.pathname, filteredNavItems);
  
  // Don't show breadcrumbs on the dashboard
  if (location.pathname === '/' || location.pathname === '/dashboard' || breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <div className={`mb-6 ${className}`}>
      <nav aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.path || breadcrumb.label} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <svg 
                  className="w-4 h-4 mx-1 text-text-tertiary" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
              
              {/* Breadcrumb link or current page */}
              {breadcrumb.path && index < breadcrumbs.length - 1 ? (
                <Link
                  to={breadcrumb.path}
                  className="
                    text-text-secondary hover:text-text-primary
                    text-sm font-medium
                    transition-colors duration-200
                    focus-ring rounded-sm
                  "
                  aria-label={`Navigate to ${breadcrumb.label}`}
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span 
                  className="text-text-primary text-sm font-medium"
                  aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                >
                  {breadcrumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
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

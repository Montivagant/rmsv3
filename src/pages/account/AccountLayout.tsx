import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../rbac/roles';
import { cn } from '../../lib/utils';

interface AccountTab {
  id: string;
  label: string;
  path: string;
  icon: string;
}

const ACCOUNT_TABS: AccountTab[] = [
  {
    id: 'profile',
    label: 'My Profile',
    path: '/account/profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
  },
  {
    id: 'business',
    label: 'Business Details',
    path: '/account/business', 
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
  },
  {
    id: 'preferences',
    label: 'Preferences',
    path: '/account/preferences',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/account/notifications',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
  },
  {
    id: 'security',
    label: 'Security',
    path: '/account/security',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
  }
];

export default function AccountLayout() {
  const location = useLocation();
  const currentUser = getCurrentUser();

  // Redirect to profile tab if on base account path
  React.useEffect(() => {
    if (location.pathname === '/account') {
      // This would be handled by a redirect route in the router
    }
  }, [location.pathname]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Account Settings
        </h1>
        <p className="text-text-secondary">
          Manage your profile, business details, and preferences
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border-primary mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Account settings tabs">
          {ACCOUNT_TABS.map((tab) => {
            const isActive = location.pathname === tab.path;
            
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={cn(
                  'group inline-flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <svg 
                  className="w-5 h-5 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={tab.icon} 
                  />
                </svg>
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}

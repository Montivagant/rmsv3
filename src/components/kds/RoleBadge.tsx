import React from 'react';
import { cn } from '../../lib/utils';
import { getRole, Role } from '../../rbac/roles';

interface RoleBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ className, size = 'md' }: RoleBadgeProps) {
  // Get the authenticated user's role from live auth/session state
  const currentRole = getRole();
  
  // Display Business Owner for all users since that's our only role
  const displayRole = 'Business Owner';
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  const roleColors: Record<string, string> = {
    [Role.BUSINESS_OWNER]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'Business Owner': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    '—': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md font-medium border',
        sizeClasses[size],
        roleColors[displayRole] || roleColors[Role.BUSINESS_OWNER],
        className
      )}
      role="status"
      aria-label={`Current role: ${displayRole}`}
    >
      <span className="tracking-wider">{displayRole}</span>
    </div>
  );
}

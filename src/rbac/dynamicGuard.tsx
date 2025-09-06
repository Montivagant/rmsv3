/**
 * Dynamic Permission Guard
 * 
 * Enhanced guard component that supports granular permission checking
 * with the new dynamic RBAC system
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from './roles';
import { dynamicRBACService } from './dynamicRBACService';

interface DynamicPermissionGuardProps {
  children: ReactNode;
  permissionId?: string;
  module?: string;
  action?: string;
  context?: any;
  fallback?: ReactNode;
  fallbackPath?: string;
}

/**
 * Guard component for dynamic permission checking
 */
export function DynamicPermissionGuard({
  children,
  permissionId,
  module,
  action,
  context = {},
  fallback,
  fallbackPath = '/'
}: DynamicPermissionGuardProps) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  let hasAccess = false;

  if (permissionId) {
    // Check specific permission ID
    hasAccess = dynamicRBACService.hasPermission(currentUser.id, permissionId, context);
  } else if (module && action) {
    // Check module and action combination
    hasAccess = dynamicRBACService.hasModuleAccess(currentUser.id, module, action, context);
  } else {
    console.warn('DynamicPermissionGuard: Either permissionId or module+action must be provided');
    hasAccess = false;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

/**
 * Hook for checking permissions in components
 */
export function usePermissions() {
  const currentUser = getCurrentUser();

  return {
    hasPermission: (permissionId: string, context: any = {}) => {
      if (!currentUser) return false;
      return dynamicRBACService.hasPermission(currentUser.id, permissionId, context);
    },
    
    hasModuleAccess: (module: string, action: string, context: any = {}) => {
      if (!currentUser) return false;
      return dynamicRBACService.hasModuleAccess(currentUser.id, module, action, context);
    },
    
    getUserRoles: () => {
      if (!currentUser) return [];
      return dynamicRBACService.getUserRoles(currentUser.id);
    },
    
    canManageRoles: () => {
      if (!currentUser) return false;
      return dynamicRBACService.hasPermission(currentUser.id, 'settings.role_management');
    },
    
    canManageUsers: () => {
      if (!currentUser) return false;
      return dynamicRBACService.hasPermission(currentUser.id, 'settings.user_management');
    }
  };
}

/**
 * Component for conditionally rendering based on permissions
 */
interface PermissionRenderProps {
  permissionId?: string;
  module?: string;
  action?: string;
  context?: any;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionRender({
  permissionId,
  module,
  action,
  context = {},
  children,
  fallback = null
}: PermissionRenderProps) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return <>{fallback}</>;
  }

  let hasAccess = false;

  if (permissionId) {
    hasAccess = dynamicRBACService.hasPermission(currentUser.id, permissionId, context);
  } else if (module && action) {
    hasAccess = dynamicRBACService.hasModuleAccess(currentUser.id, module, action, context);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component for protecting components with permissions
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissionId?: string,
  module?: string,
  action?: string
) {
  return function PermissionProtectedComponent(props: P) {
    return (
      <DynamicPermissionGuard
        permissionId={permissionId}
        module={module}
        action={action}
      >
        <Component {...props} />
      </DynamicPermissionGuard>
    );
  };
}
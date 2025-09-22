/**
 * Dynamic Permission Guard
 * 
 * Enhanced guard component that supports granular permission checking
 * with the new dynamic RBAC system
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser, Role } from './roles';
import { dynamicRBACService } from './dynamicRBACService';

interface DynamicRoleGuardProps {
  children: ReactNode;
  requiredPermission: string;
  fallback?: ReactNode;
}

export function DynamicRoleGuard({ children, requiredPermission, fallback }: DynamicRoleGuardProps) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    if (import.meta.env.DEV) {
      const mockUser = {
        id: 'dev-user',
        name: 'Development User',
        role: Role.BUSINESS_OWNER,
      };
      setCurrentUser(mockUser);
      return <>{children}</>;
    }
    return <Navigate to="/login" replace />;
  }

  if (!dynamicRBACService.hasPermission(currentUser.id, requiredPermission)) {
    // Log permission failure in development
    if (import.meta.env.DEV) {
      console.warn(`Permission denied: User ${currentUser.id} lacks permission ${requiredPermission}`);
    }
    return fallback || <Navigate to="/" replace />;
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
    
    hasModuleAccess: (module: string, action: string) => {
      if (!currentUser) return false;
      return dynamicRBACService.hasModuleAccess(currentUser.id, module, action);
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
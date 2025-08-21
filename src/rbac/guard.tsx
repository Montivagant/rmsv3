import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Role, getCurrentUser, hasPermission } from './roles';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: Role;
  fallback?: ReactNode;
}

export function RoleGuard({ children, requiredRole = Role.STAFF, fallback }: RoleGuardProps) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasPermission(currentUser.role, requiredRole)) {
    return fallback || <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
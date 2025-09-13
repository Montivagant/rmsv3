import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Role, getCurrentUser, hasPermission, setCurrentUser } from './roles';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: Role;
  fallback?: ReactNode;
}

export function RoleGuard({ children, requiredRole = Role.BUSINESS_OWNER, fallback }: RoleGuardProps) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    // Development mode bypass - auto-login as Business Owner
    if (import.meta.env.DEV) {
      const mockUser = {
        id: 'dev-user',
        name: 'Development User',
        role: Role.BUSINESS_OWNER,
      };
      setCurrentUser(mockUser);
      // Re-render will now have user
      return <>{children}</>;
    }
    return <Navigate to="/login" replace />;
  }
  
  if (!hasPermission(currentUser.role, requiredRole)) {
    return fallback || <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
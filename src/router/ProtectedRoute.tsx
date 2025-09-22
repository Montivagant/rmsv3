import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../rbac/roles';
import { logger } from '../shared/logger';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Component to handle authentication protection for routes
 * Redirects to login if not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    // In development, auto-login is handled in RouterProvider.tsx
    // Here we just handle the case where we still don't have a user
    logger.info('Protected route accessed without authentication, redirecting to login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return <>{children}</>;
}

export default ProtectedRoute;

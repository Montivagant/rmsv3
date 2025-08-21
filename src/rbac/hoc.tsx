import { RoleGuard } from './guard';
import type { Role } from './roles';

// Higher-order component for protecting routes
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: Role
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard requiredRole={requiredRole}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
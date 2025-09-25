import { SYSTEM_ROLES } from './permissions';

export const Role = {
  BUSINESS_OWNER: 'BUSINESS_OWNER',
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface User {
  id: string;
  name: string;
  role: Role;
}

// Role hierarchy: BUSINESS_OWNER has highest privilege
export const roleHierarchy: Record<Role, number> = {
  [Role.BUSINESS_OWNER]: 10,
};

// Alias for roleHierarchy to match component usage
export const RANK = roleHierarchy;

// Get current user's role
export function getRole(): Role {
  const user = getCurrentUser();
  // In development, default to BUSINESS_OWNER if no user is set
  if (!user && import.meta.env.DEV) {
    return Role.BUSINESS_OWNER;
  }
  return (user?.role as Role) || Role.BUSINESS_OWNER;
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function userHasPermission(user: User, requiredPermission: string): boolean {
  // In our simplified system, the Business Owner has all permissions.
  // A real implementation would check against the user's role's permissions array.
  if (user.role === Role.BUSINESS_OWNER) {
    return true;
  }
  // This is where dynamic role permission checking would go.
  const userRoleDetails = SYSTEM_ROLES.find(role => role.id === user.role);
  if (userRoleDetails) {
    return userRoleDetails.permissions.some(permission => permission.id === requiredPermission);
  }
  return false;
}

// Mock user storage for development
export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('rms_current_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  // Default to Business Owner in development
  if (import.meta.env.DEV) {
    return {
      id: 'business-owner',
      name: 'Business Owner',
      role: Role.BUSINESS_OWNER,
    };
  }
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('rms_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('rms_current_user');
  }
}


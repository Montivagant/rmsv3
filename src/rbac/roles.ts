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
  
  // Always return BUSINESS_OWNER (single role system)
  return Role.BUSINESS_OWNER;
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
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
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('rms_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('rms_current_user');
  }
}
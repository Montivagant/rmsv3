/**
 * Dynamic RBAC Service
 * 
 * Service for managing dynamic roles and permissions with admin interface support
 */

import { SYSTEM_ROLES, SYSTEM_PERMISSIONS, PermissionChecker } from './permissions';
import type { DynamicRole, Permission, PermissionScope } from './permissions';
import { getCurrentUser } from './roles';

interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: number;
  assignedBy: string;
  expiresAt?: number;
  scope?: {
    branches?: string[];
    departments?: string[];
  };
}

class DynamicRBACService {
  private customRoles: Map<string, DynamicRole> = new Map();
  private roleAssignments: Map<string, RoleAssignment[]> = new Map();
  private permissionOverrides: Map<string, Permission[]> = new Map();

  constructor() {
    this.initializeSystemRoles();
  }
  
  // Initialize/refresh system roles with latest permissions
  private initializeSystemRoles(): void {
    SYSTEM_ROLES.forEach(role => {
      this.customRoles.set(role.id, role);
      
      // RBAC logging disabled by default to prevent console noise and DevTools serialization issues
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGGING === 'true' && role.id === 'business_owner' && !(globalThis as any).__RMS_RBAC_LOGGED) {
        const menuPermissions = role.permissions.filter(p => p.module === 'menu');
        console.log(`🔑 RBAC: Loaded ${role.permissions.length} permissions, ${menuPermissions.length} menu permissions`);
        (globalThis as any).__RMS_RBAC_LOGGED = true;
      }
    });
  }
  
  // Force refresh of system roles (for development)
  public refreshSystemRoles(): void {
    this.initializeSystemRoles();
  }

  // Role Management
  public createRole(name: string, description: string, basePermissions: Permission[] = []): DynamicRole {
    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRole: DynamicRole = {
      id: roleId,
      name,
      description,
      permissions: basePermissions,
      isSystem: false,
      createdBy: getCurrentUser()?.id || 'system',
      createdAt: Date.now(),
      modifiedBy: getCurrentUser()?.id || 'system',
      modifiedAt: Date.now()
    };
    
    this.customRoles.set(roleId, newRole);
    return newRole;
  }

  public updateRole(roleId: string, updates: Partial<DynamicRole>): DynamicRole | null {
    const role = this.customRoles.get(roleId);
    if (!role || role.isSystem) return null;

    const updatedRole: DynamicRole = {
      ...role,
      ...updates,
      id: role.id, // Ensure ID cannot be changed
      isSystem: role.isSystem, // Ensure system flag cannot be changed
      modifiedBy: getCurrentUser()?.id || 'system',
      modifiedAt: Date.now()
    };

    this.customRoles.set(roleId, updatedRole);
    return updatedRole;
  }

  public deleteRole(roleId: string): boolean {
    const role = this.customRoles.get(roleId);
    if (!role || role.isSystem) return false;

    // Remove all assignments of this role
    this.roleAssignments.forEach((assignments, userId) => {
      const filtered = assignments.filter(a => a.roleId !== roleId);
      if (filtered.length === 0) {
        this.roleAssignments.delete(userId);
      } else {
        this.roleAssignments.set(userId, filtered);
      }
    });

    this.customRoles.delete(roleId);
    return true;
  }

  public getAllRoles(): DynamicRole[] {
    return Array.from(this.customRoles.values());
  }

  public listRoles(): DynamicRole[] {
    return Array.from(this.customRoles.values()).filter(r => !r.isSystem);
  }

  public getRole(roleId: string): DynamicRole | null {
    return this.customRoles.get(roleId) || null;
  }

  // Permission Management
  public enablePermissionForRole(roleId: string, permissionId: string): boolean {
    const role = this.customRoles.get(roleId);
    if (!role || role.isSystem) return false;

    const permission = SYSTEM_PERMISSIONS.find(p => p.id === permissionId);
    if (!permission) return false;

    if (!role.permissions.some(p => p.id === permissionId)) {
      role.permissions.push(permission);
      this.updateRole(roleId, { permissions: role.permissions });
    }

    return true;
  }

  public disablePermissionForRole(roleId: string, permissionId: string): boolean {
    const role = this.customRoles.get(roleId);
    if (!role || role.isSystem) return false;

    role.permissions = role.permissions.filter(p => p.id !== permissionId);
    this.updateRole(roleId, { permissions: role.permissions });
    return true;
  }

  public setPermissionScope(roleId: string, permissionId: string, scope: PermissionScope): boolean {
    const role = this.customRoles.get(roleId);
    if (!role || role.isSystem) return false;

    const permission = role.permissions.find(p => p.id === permissionId);
    if (!permission) return false;

    permission.scope = scope;
    this.updateRole(roleId, { permissions: role.permissions });
    return true;
  }

  // User Assignment
  public assignUserToRole(userId: string, roleId: string, scope?: RoleAssignment['scope']): boolean {
    const role = this.customRoles.get(roleId);
    if (!role) return false;

    const userAssignments = this.roleAssignments.get(userId) || [];
    
    // Check if already assigned
    if (userAssignments.some(a => a.roleId === roleId)) {
      return false;
    }

    const assignment: RoleAssignment = {
      userId,
      roleId,
      assignedAt: Date.now(),
      assignedBy: getCurrentUser()?.id || 'system',
      ...(scope && { scope })
    };

    userAssignments.push(assignment);
    this.roleAssignments.set(userId, userAssignments);
    return true;
  }

  public removeUserFromRole(userId: string, roleId: string): boolean {
    const userAssignments = this.roleAssignments.get(userId);
    if (!userAssignments) return false;

    const filtered = userAssignments.filter(a => a.roleId !== roleId);
    if (filtered.length === userAssignments.length) return false;

    if (filtered.length === 0) {
      this.roleAssignments.delete(userId);
    } else {
      this.roleAssignments.set(userId, filtered);
    }

    return true;
  }

  public getUserRoles(userId: string): DynamicRole[] {
    const assignments = this.roleAssignments.get(userId) || [];
    const roles: DynamicRole[] = [];

    // Check for legacy getCurrentUser role
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId && currentUser.role) {
      // Convert BUSINESS_OWNER to business_owner for lookup
      const roleKey = currentUser.role === 'BUSINESS_OWNER' ? 'business_owner' : 'business_owner';
      const legacyRole = this.customRoles.get(roleKey);
      if (legacyRole) {
        roles.push(legacyRole);
      }
    }

    // Add assigned roles
    assignments.forEach(assignment => {
      const role = this.customRoles.get(assignment.roleId);
      if (role) {
        roles.push(role);
      }
    });

    return roles;
  }

  public getUsersWithRole(roleId: string): string[] {
    const users: string[] = [];
    
    this.roleAssignments.forEach((assignments, userId) => {
      if (assignments.some(a => a.roleId === roleId)) {
        users.push(userId);
      }
    });

    return users;
  }

  // Permission Checking (Enhanced)
  public hasPermission(userId: string, permissionId: string, context: any = {}): boolean {
    const userRoles = this.getUserRoles(userId);
    
    // Permission check logging disabled to reduce console noise
    
    // Check all user roles
    for (const role of userRoles) {
      if (PermissionChecker.hasPermission(role, permissionId)) {
        const permission = role.permissions.find(p => p.id === permissionId);
        if (permission && PermissionChecker.isPermissionValidInContext(permission, context)) {
          return true;
        }
      }
    }

    // Check permission overrides
    const overrides = this.permissionOverrides.get(userId);
    if (overrides) {
      const override = overrides.find(p => p.id === permissionId);
      if (override && PermissionChecker.isPermissionValidInContext(override, context)) {
        return true;
      }
    }

    return false;
  }

  public hasModuleAccess(userId: string, module: string, action: string): boolean {
    const userRoles = this.getUserRoles(userId);
    
    for (const role of userRoles) {
      if (PermissionChecker.hasModuleAccess(role, module, action)) {
        return true;
      }
    }

    return false;
  }

  // Permission Overrides (for temporary permissions)
  public grantTemporaryPermission(userId: string, permission: Permission, durationMinutes?: number): void {
    const overrides = this.permissionOverrides.get(userId) || [];
    
    if (durationMinutes) {
      // Add expiration to permission scope
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      permission = {
        ...permission,
        scope: {
          ...permission.scope,
          conditions: {
            ...permission.scope?.conditions,
            expiresAt: expiresAt.toISOString()
          } as any // Allow expiresAt for temporary permissions
        }
      };
    }

    overrides.push(permission);
    this.permissionOverrides.set(userId, overrides);
  }

  public revokeTemporaryPermission(userId: string, permissionId: string): boolean {
    const overrides = this.permissionOverrides.get(userId);
    if (!overrides) return false;

    const filtered = overrides.filter(p => p.id !== permissionId);
    if (filtered.length === overrides.length) return false;

    if (filtered.length === 0) {
      this.permissionOverrides.delete(userId);
    } else {
      this.permissionOverrides.set(userId, filtered);
    }

    return true;
  }

  // Utility Methods
  public exportRoles(): string {
    const roles = this.getAllRoles().filter(r => !r.isSystem);
    return JSON.stringify(roles, null, 2);
  }

  public importRoles(rolesJson: string): number {
    try {
      const roles = JSON.parse(rolesJson) as DynamicRole[];
      let imported = 0;

      roles.forEach(role => {
        if (!role.isSystem && !this.customRoles.has(role.id)) {
          this.customRoles.set(role.id, {
            ...role,
            modifiedAt: Date.now(),
            modifiedBy: getCurrentUser()?.id || 'system'
          });
          imported++;
        }
      });

      return imported;
    } catch {
      throw new Error('Invalid roles JSON format');
    }
  }
}

export const dynamicRBACService = new DynamicRBACService();

// Force refresh system roles in development to pick up new permissions
if (import.meta.env.DEV) {
  // Clear any cached permission data that might be stale
  const permissionCacheKeys = Object.keys(localStorage).filter(key => 
    key.includes('rbac') || key.includes('permission') || key.includes('role')
  );
  permissionCacheKeys.forEach(key => localStorage.removeItem(key));
  
  // Refresh system roles with new permissions
  dynamicRBACService.refreshSystemRoles();
  
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    console.log('🔄 RBAC: System roles refreshed');
  }
}
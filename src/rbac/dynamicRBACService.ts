/**
 * Dynamic RBAC Service
 * 
 * Service for managing dynamic roles and permissions with admin interface support
 */

import { eventStore } from '../events/store';
import { SYSTEM_ROLES, SYSTEM_PERMISSIONS, PermissionChecker } from './permissions';
import type { DynamicRole, Permission } from './permissions';
import { getCurrentUser } from './roles';
import { auditLogger } from './audit';

// Events for role management
interface RoleCreatedEvent {
  roleId: string;
  roleName: string;
  permissions: string[];
  createdBy: string;
}

interface RoleUpdatedEvent {
  roleId: string;
  changes: {
    name?: string;
    description?: string;
    permissions?: string[];
  };
  updatedBy: string;
}

interface RoleDeletedEvent {
  roleId: string;
  deletedBy: string;
}

interface UserRoleAssignedEvent {
  userId: string;
  roleId: string;
  assignedBy: string;
}

/**
 * Dynamic RBAC Service for managing roles and permissions
 */
export class DynamicRBACService {
  private static instance: DynamicRBACService;
  private roles: Map<string, DynamicRole> = new Map();
  private userRoles: Map<string, string[]> = new Map(); // userId -> roleIds

  private constructor() {
    // Initialize with system roles
    SYSTEM_ROLES.forEach(role => {
      this.roles.set(role.id, role);
    });
    
    // Load any custom roles from events
    this.loadRolesFromEvents();
  }

  static getInstance(): DynamicRBACService {
    if (!DynamicRBACService.instance) {
      DynamicRBACService.instance = new DynamicRBACService();
    }
    return DynamicRBACService.instance;
  }

  /**
   * Load custom roles from event store
   */
  private loadRolesFromEvents() {
    // Get all events and filter for role-related types
    const allEvents = eventStore.getAll();
    const roleEvents = allEvents.filter(event => 
      ['role.created', 'role.updated', 'role.deleted'].includes(event.type)
    );

    // Apply events in order to reconstruct current state
    roleEvents.forEach(event => {
      switch (event.type) {
        case 'role.created':
          this.applyRoleCreatedEvent(event.payload as RoleCreatedEvent);
          break;
        case 'role.updated':
          this.applyRoleUpdatedEvent(event.payload as RoleUpdatedEvent);
          break;
        case 'role.deleted':
          this.applyRoleDeletedEvent(event.payload as RoleDeletedEvent);
          break;
      }
    });

    // Load user role assignments
    const userRoleEvents = eventStore.getByType('user.role.assigned');

    userRoleEvents.forEach(event => {
      const payload = event.payload as UserRoleAssignedEvent;
      const userRoles = this.userRoles.get(payload.userId) || [];
      if (!userRoles.includes(payload.roleId)) {
        userRoles.push(payload.roleId);
        this.userRoles.set(payload.userId, userRoles);
      }
    });
  }

  /**
   * Create a new custom role
   */
  async createRole(roleData: {
    name: string;
    description: string;
    permissionIds: string[];
    inheritsFrom?: string[];
  }): Promise<DynamicRole> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    // Check if user has permission to manage roles
    if (!this.hasPermission(currentUser.id, 'settings.role_management')) {
      throw new Error('Insufficient permissions to create roles');
    }

    const roleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate permissions exist
    const permissions = roleData.permissionIds.map(id => {
      const permission = SYSTEM_PERMISSIONS.find(p => p.id === id);
      if (!permission) {
        throw new Error(`Permission not found: ${id}`);
      }
      return permission;
    });

    const newRole: DynamicRole = {
      id: roleId,
      name: roleData.name,
      description: roleData.description,
      permissions,
      inheritsFrom: roleData.inheritsFrom,
      isSystem: false,
      createdBy: currentUser.id,
      createdAt: Date.now(),
      modifiedBy: currentUser.id,
      modifiedAt: Date.now()
    };

    // Store role
    this.roles.set(roleId, newRole);

    // Create event
    const eventPayload: RoleCreatedEvent = {
      roleId,
      roleName: roleData.name,
      permissions: roleData.permissionIds,
      createdBy: currentUser.id
    };

    await eventStore.append('role.created', eventPayload, {
      aggregate: { id: roleId, type: 'role' },
      params: { roleId, roleName: roleData.name }
    });

    // Audit log
    auditLogger.log({
      action: 'role_created',
      resource: `roles.${roleId}`,
      details: { roleName: roleData.name, permissionCount: permissions.length }
    });

    return newRole;
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, updates: {
    name?: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<DynamicRole> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    if (!this.hasPermission(currentUser.id, 'settings.role_management')) {
      throw new Error('Insufficient permissions to update roles');
    }

    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    // Validate new permissions if provided
    let newPermissions = role.permissions;
    if (updates.permissionIds) {
      newPermissions = updates.permissionIds.map(id => {
        const permission = SYSTEM_PERMISSIONS.find(p => p.id === id);
        if (!permission) {
          throw new Error(`Permission not found: ${id}`);
        }
        return permission;
      });
    }

    // Update role
    const updatedRole: DynamicRole = {
      ...role,
      name: updates.name || role.name,
      description: updates.description || role.description,
      permissions: newPermissions,
      modifiedBy: currentUser.id,
      modifiedAt: Date.now()
    };

    this.roles.set(roleId, updatedRole);

    // Create event
    const eventPayload: RoleUpdatedEvent = {
      roleId,
      changes: {
        ...updates,
        permissions: updates.permissionIds
      },
      updatedBy: currentUser.id
    };

    await eventStore.append('role.updated', eventPayload, {
      aggregate: { id: roleId, type: 'role' },
      params: { roleId, changes: updates }
    });

    // Audit log
    auditLogger.log({
      action: 'role_updated',
      resource: `roles.${roleId}`,
      details: { roleName: updatedRole.name, changes: Object.keys(updates) }
    });

    return updatedRole;
  }

  /**
   * Delete a custom role
   */
  async deleteRole(roleId: string): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    if (!this.hasPermission(currentUser.id, 'settings.role_management')) {
      throw new Error('Insufficient permissions to delete roles');
    }

    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const usersWithRole = Array.from(this.userRoles.entries())
      .filter(([_, roles]) => roles.includes(roleId));
    
    if (usersWithRole.length > 0) {
      throw new Error(`Cannot delete role: assigned to ${usersWithRole.length} user(s)`);
    }

    // Remove role
    this.roles.delete(roleId);

    // Create event
    const eventPayload: RoleDeletedEvent = {
      roleId,
      deletedBy: currentUser.id
    };

    await eventStore.append('role.deleted', eventPayload, {
      aggregate: { id: roleId, type: 'role' }
    });

    // Audit log
    auditLogger.log({
      action: 'role_deleted',
      resource: `roles.${roleId}`,
      details: { roleName: role.name }
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    if (!this.hasPermission(currentUser.id, 'settings.user_management')) {
      throw new Error('Insufficient permissions to assign roles');
    }

    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    const userRoles = this.userRoles.get(userId) || [];
    if (!userRoles.includes(roleId)) {
      userRoles.push(roleId);
      this.userRoles.set(userId, userRoles);

      // Create event
      const eventPayload: UserRoleAssignedEvent = {
        userId,
        roleId,
        assignedBy: currentUser.id
      };

      await eventStore.append('user.role.assigned', eventPayload, {
        aggregate: { id: userId, type: 'user' }
      });

      // Audit log
      auditLogger.log({
        action: 'role_assigned',
        resource: `users.${userId}`,
        details: { roleId, roleName: role.name }
      });
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userId: string, permissionId: string, context: any = {}): boolean {
    const userRoles = this.getUserRoles(userId);
    
    for (const role of userRoles) {
      const validPermissions = PermissionChecker.getValidPermissions(role, context);
      if (validPermissions.some(p => p.id === permissionId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if user has module access
   */
  hasModuleAccess(userId: string, module: string, action: string, context: any = {}): boolean {
    const userRoles = this.getUserRoles(userId);
    
    for (const role of userRoles) {
      const validPermissions = PermissionChecker.getValidPermissions(role, context);
      if (validPermissions.some(p => p.module === module && p.action === action)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get user's roles
   */
  getUserRoles(userId: string): DynamicRole[] {
    const roleIds = this.userRoles.get(userId) || [];
    return roleIds.map(id => this.roles.get(id)).filter(Boolean) as DynamicRole[];
  }

  /**
   * Get all available roles
   */
  getAllRoles(): DynamicRole[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Permission[] {
    return SYSTEM_PERMISSIONS;
  }

  /**
   * Apply role created event
   */
  private applyRoleCreatedEvent(event: RoleCreatedEvent) {
    const permissions = event.permissions.map(id => 
      SYSTEM_PERMISSIONS.find(p => p.id === id)
    ).filter(Boolean) as Permission[];

    const role: DynamicRole = {
      id: event.roleId,
      name: event.roleName,
      description: '',
      permissions,
      isSystem: false,
      createdBy: event.createdBy,
      createdAt: Date.now(),
      modifiedBy: event.createdBy,
      modifiedAt: Date.now()
    };

    this.roles.set(event.roleId, role);
  }

  /**
   * Apply role updated event
   */
  private applyRoleUpdatedEvent(event: RoleUpdatedEvent) {
    const role = this.roles.get(event.roleId);
    if (!role) return;

    if (event.changes.permissions) {
      const permissions = event.changes.permissions.map(id => 
        SYSTEM_PERMISSIONS.find(p => p.id === id)
      ).filter(Boolean) as Permission[];
      role.permissions = permissions;
    }

    if (event.changes.name) {
      role.name = event.changes.name;
    }

    if (event.changes.description) {
      role.description = event.changes.description;
    }

    role.modifiedBy = event.updatedBy;
    role.modifiedAt = Date.now();

    this.roles.set(event.roleId, role);
  }

  /**
   * Apply role deleted event
   */
  private applyRoleDeletedEvent(event: RoleDeletedEvent) {
    this.roles.delete(event.roleId);
  }
}

// Export singleton instance
export const dynamicRBACService = DynamicRBACService.getInstance();
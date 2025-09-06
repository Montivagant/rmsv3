/**
 * Dynamic RBAC Permission System
 * 
 * This module provides a flexible permission system where administrators can create
 * custom roles with granular scope assignment capabilities.
 */

// Permission scopes for granular access control
export interface PermissionScope {
  resource?: string;      // e.g., 'inventory:item:123', 'customer:456', 'location:store-1'
  operation?: string;     // e.g., 'read', 'write', 'delete', 'approve'
  conditions?: {          // Conditional permissions
    timeRange?: {
      start: string;      // HH:MM format
      end: string;        // HH:MM format
      days?: number[];    // 0=Sunday, 1=Monday, etc.
    };
    location?: string[];  // Allowed locations
    device?: string[];    // Allowed device types
    ipRange?: string[];   // Allowed IP ranges
  };
}

// Core permission definition
export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;         // 'pos', 'inventory', 'customers', 'reports', etc.
  action: string;         // 'view', 'edit', 'delete', 'manage', etc.
  scope?: PermissionScope;
  inherits?: string[];    // Permissions this permission inherits from
}

// Role definition with dynamic permissions
export interface DynamicRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: string[]; // Other roles this role inherits from
  isSystem: boolean;       // System roles cannot be deleted
  createdBy: string;
  createdAt: number;
  modifiedBy: string;
  modifiedAt: number;
}

// Pre-defined system permissions
export const SYSTEM_PERMISSIONS: Permission[] = [
  // Dashboard permissions
  {
    id: 'dashboard.view',
    name: 'View Dashboard',
    description: 'Access to main dashboard and KPI overview',
    module: 'dashboard',
    action: 'view'
  },
  
  // POS permissions
  {
    id: 'pos.access',
    name: 'Access POS',
    description: 'Basic access to Point of Sale system',
    module: 'pos',
    action: 'access'
  },
  {
    id: 'pos.process_payment',
    name: 'Process Payments',
    description: 'Process customer payments and complete transactions',
    module: 'pos',
    action: 'process_payment'
  },
  {
    id: 'pos.apply_discount',
    name: 'Apply Discounts',
    description: 'Apply discounts to orders',
    module: 'pos',
    action: 'apply_discount'
  },
  {
    id: 'pos.void_transaction',
    name: 'Void Transactions',
    description: 'Void or cancel transactions',
    module: 'pos',
    action: 'void_transaction'
  },
  
  // Inventory permissions
  {
    id: 'inventory.view',
    name: 'View Inventory',
    description: 'View inventory items and stock levels',
    module: 'inventory',
    action: 'view'
  },
  {
    id: 'inventory.edit',
    name: 'Edit Inventory',
    description: 'Modify inventory items and quantities',
    module: 'inventory',
    action: 'edit'
  },
  {
    id: 'inventory.receive',
    name: 'Receive Inventory',
    description: 'Process inventory receipts and deliveries',
    module: 'inventory',
    action: 'receive'
  },
  {
    id: 'inventory.adjust',
    name: 'Adjust Inventory',
    description: 'Make inventory adjustments and corrections',
    module: 'inventory',
    action: 'adjust'
  },
  {
    id: 'inventory.count',
    name: 'Count Inventory',
    description: 'Perform inventory counts and audits',
    module: 'inventory',
    action: 'count'
  },
  
  // Customer permissions
  {
    id: 'customers.view',
    name: 'View Customers',
    description: 'View customer information and profiles',
    module: 'customers',
    action: 'view'
  },
  {
    id: 'customers.edit',
    name: 'Edit Customers',
    description: 'Modify customer information',
    module: 'customers',
    action: 'edit'
  },
  {
    id: 'customers.loyalty_adjust',
    name: 'Adjust Loyalty Points',
    description: 'Manually adjust customer loyalty points',
    module: 'customers',
    action: 'loyalty_adjust'
  },
  
  // Recipe permissions
  {
    id: 'recipes.view',
    name: 'View Recipes',
    description: 'View recipes and bill of materials',
    module: 'recipes',
    action: 'view'
  },
  {
    id: 'recipes.edit',
    name: 'Edit Recipes',
    description: 'Create and modify recipes',
    module: 'recipes',
    action: 'edit'
  },
  {
    id: 'recipes.cost_analysis',
    name: 'Recipe Cost Analysis',
    description: 'Access recipe costing and profitability analysis',
    module: 'recipes',
    action: 'cost_analysis'
  },
  
  // Reports permissions
  {
    id: 'reports.view',
    name: 'View Reports',
    description: 'Access to basic reports and analytics',
    module: 'reports',
    action: 'view'
  },
  {
    id: 'reports.export',
    name: 'Export Reports',
    description: 'Export reports to various formats',
    module: 'reports',
    action: 'export'
  },
  {
    id: 'reports.z_reports',
    name: 'Z-Reports',
    description: 'Access to daily Z-reports and end-of-day summaries',
    module: 'reports',
    action: 'z_reports'
  },
  
  // Settings permissions
  {
    id: 'settings.view',
    name: 'View Settings',
    description: 'View system and business settings',
    module: 'settings',
    action: 'view'
  },
  {
    id: 'settings.edit',
    name: 'Edit Settings',
    description: 'Modify system and business settings',
    module: 'settings',
    action: 'edit'
  },
  {
    id: 'settings.user_management',
    name: 'User Management',
    description: 'Manage user accounts and role assignments',
    module: 'settings',
    action: 'user_management'
  },
  {
    id: 'settings.role_management',
    name: 'Role Management',
    description: 'Create and manage user roles and permissions',
    module: 'settings',
    action: 'role_management'
  },
  {
    id: 'settings.system_config',
    name: 'System Configuration',
    description: 'Access to technical system configuration',
    module: 'settings',
    action: 'system_config'
  }
];

// Default system roles - single role system
export const SYSTEM_ROLES: DynamicRole[] = [
  {
    id: 'business_owner',
    name: 'Business Owner',
    description: 'Business owner with full system access',
    permissions: SYSTEM_PERMISSIONS,
    isSystem: true,
    createdBy: 'system',
    createdAt: Date.now(),
    modifiedBy: 'system',
    modifiedAt: Date.now()
  }
];

// Permission checking utility
export class PermissionChecker {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: DynamicRole, permissionId: string): boolean {
    return role.permissions.some(permission => permission.id === permissionId);
  }

  /**
   * Check if a role has permission for a specific module and action
   */
  static hasModuleAccess(role: DynamicRole, module: string, action: string): boolean {
    return role.permissions.some(permission => 
      permission.module === module && permission.action === action
    );
  }

  /**
   * Check if permission is valid for current context (time, location, etc.)
   */
  static isPermissionValidInContext(permission: Permission, context: {
    currentTime?: Date;
    userLocation?: string;
    userDevice?: string;
    userIp?: string;
  } = {}): boolean {
    if (!permission.scope?.conditions) {
      return true; // No conditions means always valid
    }

    const { conditions } = permission.scope;
    const { currentTime = new Date(), userLocation, userDevice, userIp } = context;

    // Check time-based conditions
    if (conditions.timeRange) {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      const [startHour, startMinute] = conditions.timeRange.start.split(':').map(Number);
      const [endHour, endMinute] = conditions.timeRange.end.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
        return false;
      }

      // Check day of week if specified
      if (conditions.timeRange.days) {
        const currentDay = currentTime.getDay();
        if (!conditions.timeRange.days.includes(currentDay)) {
          return false;
        }
      }
    }

    // Check location conditions
    if (conditions.location && userLocation && !conditions.location.includes(userLocation)) {
      return false;
    }

    // Check device conditions
    if (conditions.device && userDevice && !conditions.device.includes(userDevice)) {
      return false;
    }

    // Check IP range conditions (simplified check)
    if (conditions.ipRange && userIp && !conditions.ipRange.some(range => userIp.startsWith(range))) {
      return false;
    }

    return true;
  }

  /**
   * Get all valid permissions for a role in current context
   */
  static getValidPermissions(role: DynamicRole, context: any = {}): Permission[] {
    return role.permissions.filter(permission => 
      this.isPermissionValidInContext(permission, context)
    );
  }
}
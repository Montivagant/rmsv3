# Dynamic RBAC Implementation Plan

## Overview

This document outlines the implementation plan for a fully dynamic Role-Based Access Control (RBAC) system that allows users to:
- Create custom roles
- Toggle features on/off for each role
- Easily add accounts/users to roles
- Define scopes for permissions

## Current State

The system currently has a basic RBAC implementation with:
- Fixed system roles (BUSINESS_OWNER, STAFF, etc.)
- Simple permission checks based on role hierarchy
- No UI for role management
- Limited scope definition capabilities

## Implementation Plan

### 1. Enhanced Role Management Service

Extend the current `DynamicRBACService` to support:

```typescript
// Role management functions
createRole(name: string, description: string, basePermissions: Permission[]): DynamicRole
updateRole(roleId: string, updates: Partial<DynamicRole>): DynamicRole
deleteRole(roleId: string): boolean

// Permission toggles
enablePermissionForRole(roleId: string, permissionId: string): void
disablePermissionForRole(roleId: string, permissionId: string): void

// User assignment
assignUserToRole(userId: string, roleId: string): void
removeUserFromRole(userId: string, roleId: string): void
getUserRoles(userId: string): DynamicRole[]
getUsersWithRole(roleId: string): string[]

// Scope management
setPermissionScope(roleId: string, permissionId: string, scope: PermissionScope): void
```

### 2. Role Management UI

Create an intuitive admin interface for role management:

- **Role List View**
  - Display all roles (system + custom)
  - Create/Edit/Delete operations
  - User counts per role

- **Role Detail View**
  - Role information editor
  - Feature toggle matrix
  - User assignment section

- **Permission Configuration**
  - Grouped by module/feature
  - Toggle switches for each permission
  - Scope definition interface
  - Inheritance visualization

- **User Assignment**
  - Search users
  - Batch assign/remove
  - Current role display

### 3. Enhanced Permission System

Implement granular permission definitions:

```typescript
interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;       // e.g., 'inventory', 'pos', 'reports'
  action: string;       // e.g., 'view', 'create', 'delete'
  resourceType?: string; // e.g., 'item', 'order', 'customer'
  defaultEnabled: boolean;
  scopeOptions?: {
    supportsBranch: boolean;    // Branch-specific permissions
    supportsDateRange: boolean; // Time-restricted permissions
    supportsAmount: boolean;    // Value-limited permissions (e.g., max transaction)
  }
}
```

### 4. Scope Definition

Implement scope definitions to restrict permissions:

```typescript
interface PermissionScope {
  branches?: string[];      // Restrict to specific branches
  dateRange?: {            // Time-based restrictions
    start?: string;
    end?: string;
    daysOfWeek?: number[];  // 0=Sunday to 6=Saturday
    timeRange?: {
      start: string;        // HH:MM format
      end: string;          // HH:MM format
    }
  };
  limits?: {               // Value-based restrictions
    maxTransactionAmount?: number;
    maxDiscount?: number;
    maxItems?: number;
  };
}
```

### 5. Events & Persistence

Use event sourcing for all RBAC operations:

```typescript
// Event types
const RBAC_EVENTS = {
  ROLE_CREATED: 'rbac.role.created',
  ROLE_UPDATED: 'rbac.role.updated',
  ROLE_DELETED: 'rbac.role.deleted',
  PERMISSION_ENABLED: 'rbac.permission.enabled',
  PERMISSION_DISABLED: 'rbac.permission.disabled',
  PERMISSION_SCOPE_SET: 'rbac.permission.scope.set',
  USER_ASSIGNED: 'rbac.user.assigned',
  USER_REMOVED: 'rbac.user.removed'
};
```

### 6. Authorization Components

Create React components for permission-based rendering:

```tsx
// Permission-based rendering
<PermissionGuard
  requiredPermission="inventory:items:create"
  scope={{ branch: currentBranch }}
>
  <AddItemButton />
</PermissionGuard>

// Role-based rendering
<RoleGuard
  requiredRole="manager"
  fallback={<AccessDeniedMessage />}
>
  <SensitiveComponent />
</RoleGuard>
```

### 7. API & Service Integration

Implement server-side authorization checks:

```typescript
// API middleware
function authorizeRequest(permission: string, scopeCheck?: (scope: PermissionScope) => boolean) {
  return (req, res, next) => {
    const userId = req.user.id;
    const hasPermission = rbacService.hasPermission(userId, permission);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const scope = rbacService.getPermissionScope(userId, permission);
    if (scopeCheck && !scopeCheck(scope)) {
      return res.status(403).json({ error: 'Out of scope' });
    }
    
    next();
  };
}
```

## Implementation Timeline

1. **Phase 1: Core Services** (2 weeks)
   - Enhanced RBAC service
   - Permission definitions
   - Event persistence

2. **Phase 2: UI Components** (2 weeks)
   - Role management interface
   - User assignment screens
   - Permission toggles

3. **Phase 3: Integration** (1 week)
   - Connect to API layer
   - Guard components
   - Migration from old system

4. **Phase 4: Testing & Refinement** (1 week)
   - Security testing
   - Performance testing
   - UX refinement

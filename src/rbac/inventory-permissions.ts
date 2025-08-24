/**
 * Inventory RBAC Permission System
 * 
 * Defines granular permissions for inventory management based on user roles.
 * Supports progressive enhancement and feature-level access control.
 */

import { Role } from './roles';

// Inventory feature permissions by role
export const INVENTORY_PERMISSIONS = {
  // Basic inventory operations
  viewStock: [Role.STAFF, Role.ADMIN, Role.TECH_ADMIN],
  searchItems: [Role.STAFF, Role.ADMIN, Role.TECH_ADMIN],
  reportLowStock: [Role.STAFF, Role.ADMIN, Role.TECH_ADMIN],
  viewBasicDetails: [Role.STAFF, Role.ADMIN, Role.TECH_ADMIN],
  
  // Cost and financial information
  viewCosts: [Role.ADMIN, Role.TECH_ADMIN],
  viewAnalytics: [Role.ADMIN, Role.TECH_ADMIN],
  viewFinancialReports: [Role.ADMIN, Role.TECH_ADMIN],
  
  // Item management
  addItems: [Role.ADMIN, Role.TECH_ADMIN],
  editItems: [Role.ADMIN, Role.TECH_ADMIN],
  deleteItems: [Role.ADMIN, Role.TECH_ADMIN],
  adjustStock: [Role.ADMIN, Role.TECH_ADMIN],
  
  // Category management
  viewCategories: [Role.STAFF, Role.ADMIN, Role.TECH_ADMIN],
  manageCategories: [Role.ADMIN, Role.TECH_ADMIN],
  createCategories: [Role.ADMIN, Role.TECH_ADMIN],
  deleteCategories: [Role.TECH_ADMIN],
  
  // Advanced features
  recipeManagement: [Role.TECH_ADMIN],
  supplierManagement: [Role.TECH_ADMIN],
  batchTracking: [Role.TECH_ADMIN],
  expiryManagement: [Role.TECH_ADMIN],
  multiLocationInventory: [Role.TECH_ADMIN],
  
  // System administration
  systemConfiguration: [Role.TECH_ADMIN],
  dataImportExport: [Role.TECH_ADMIN],
  auditLogs: [Role.TECH_ADMIN],
  
  // Real-time features
  realTimeSync: [Role.ADMIN, Role.TECH_ADMIN],
  posIntegration: [Role.ADMIN, Role.TECH_ADMIN],
  automatedAlerts: [Role.ADMIN, Role.TECH_ADMIN],
} as const;

// Permission check function
export function hasInventoryPermission(
  userRole: Role, 
  permission: keyof typeof INVENTORY_PERMISSIONS
): boolean {
  const allowedRoles = INVENTORY_PERMISSIONS[permission];
  return allowedRoles.includes(userRole);
}

// Get all permissions for a role
export function getInventoryPermissionsForRole(userRole: Role): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  
  Object.keys(INVENTORY_PERMISSIONS).forEach(permission => {
    permissions[permission] = hasInventoryPermission(userRole, permission as keyof typeof INVENTORY_PERMISSIONS);
  });
  
  return permissions;
}

// Feature access levels
export const INVENTORY_ACCESS_LEVELS = {
  STAFF: {
    name: 'Basic Access',
    description: 'View stock levels and report issues',
    color: 'blue',
    features: [
      'View current stock levels',
      'Search and filter items',
      'Report low stock items',
      'View basic item details'
    ]
  },
  ADMIN: {
    name: 'Management Access',
    description: 'Full inventory management capabilities',
    color: 'yellow',
    features: [
      'All STAFF features',
      'Add and edit inventory items',
      'Manage categories',
      'View cost information',
      'Set reorder points',
      'Generate reports',
      'Stock adjustments'
    ]
  },
  TECH_ADMIN: {
    name: 'Advanced Access',
    description: 'Complete system control and advanced features',
    color: 'green',
    features: [
      'All ADMIN features',
      'Recipe & BOM management',
      'Supplier management',
      'Batch tracking',
      'Expiry management',
      'Multi-location inventory',
      'System configuration',
      'Advanced analytics'
    ]
  }
} as const;

// UI component visibility rules
export const INVENTORY_UI_RULES = {
  // Dashboard components
  showBasicDashboard: (role: Role) => hasInventoryPermission(role, 'viewStock'),
  showAdvancedDashboard: (role: Role) => hasInventoryPermission(role, 'viewAnalytics'),
  showFinancialMetrics: (role: Role) => hasInventoryPermission(role, 'viewCosts'),
  
  // Action buttons
  showAddItemButton: (role: Role) => hasInventoryPermission(role, 'addItems'),
  showEditItemButton: (role: Role) => hasInventoryPermission(role, 'editItems'),
  showDeleteItemButton: (role: Role) => hasInventoryPermission(role, 'deleteItems'),
  showAdjustStockButton: (role: Role) => hasInventoryPermission(role, 'adjustStock'),
  
  // Navigation tabs
  showCategoriesTab: (role: Role) => hasInventoryPermission(role, 'viewCategories'),
  showRecipesTab: (role: Role) => hasInventoryPermission(role, 'recipeManagement'),
  showSuppliersTab: (role: Role) => hasInventoryPermission(role, 'supplierManagement'),
  showAnalyticsTab: (role: Role) => hasInventoryPermission(role, 'viewAnalytics'),
  
  // Data visibility
  showCostColumns: (role: Role) => hasInventoryPermission(role, 'viewCosts'),
  showSupplierInfo: (role: Role) => hasInventoryPermission(role, 'supplierManagement'),
  showBatchInfo: (role: Role) => hasInventoryPermission(role, 'batchTracking'),
  showExpiryInfo: (role: Role) => hasInventoryPermission(role, 'expiryManagement'),
} as const;

// Audit logging for inventory actions
export const INVENTORY_AUDIT_ACTIONS = {
  // Item operations
  ITEM_CREATED: 'inventory.item.created',
  ITEM_UPDATED: 'inventory.item.updated',
  ITEM_DELETED: 'inventory.item.deleted',
  STOCK_ADJUSTED: 'inventory.stock.adjusted',
  
  // Category operations
  CATEGORY_CREATED: 'inventory.category.created',
  CATEGORY_UPDATED: 'inventory.category.updated',
  CATEGORY_DELETED: 'inventory.category.deleted',
  
  // Recipe operations
  RECIPE_CREATED: 'inventory.recipe.created',
  RECIPE_UPDATED: 'inventory.recipe.updated',
  RECIPE_DELETED: 'inventory.recipe.deleted',
  
  // Supplier operations
  SUPPLIER_CREATED: 'inventory.supplier.created',
  SUPPLIER_UPDATED: 'inventory.supplier.updated',
  SUPPLIER_DELETED: 'inventory.supplier.deleted',
  
  // System operations
  CONFIGURATION_CHANGED: 'inventory.configuration.changed',
  DATA_IMPORTED: 'inventory.data.imported',
  DATA_EXPORTED: 'inventory.data.exported',
} as const;

// Permission validation for API endpoints
export const INVENTORY_API_PERMISSIONS = {
  'GET /api/inventory/items': ['viewStock'],
  'POST /api/inventory/items': ['addItems'],
  'PUT /api/inventory/items/:id': ['editItems'],
  'DELETE /api/inventory/items/:id': ['deleteItems'],
  'PATCH /api/inventory/items/:id/stock': ['adjustStock'],
  
  'GET /api/categories': ['viewCategories'],
  'POST /api/categories': ['manageCategories'],
  'PUT /api/categories/:id': ['manageCategories'],
  'DELETE /api/categories/:id': ['manageCategories'],
  
  'GET /api/recipes': ['recipeManagement'],
  'POST /api/recipes': ['recipeManagement'],
  'PUT /api/recipes/:id': ['recipeManagement'],
  'DELETE /api/recipes/:id': ['recipeManagement'],
  
  'GET /api/suppliers': ['supplierManagement'],
  'POST /api/suppliers': ['supplierManagement'],
  'PUT /api/suppliers/:id': ['supplierManagement'],
  'DELETE /api/suppliers/:id': ['supplierManagement'],
  
  'GET /api/inventory/analytics': ['viewAnalytics'],
  'GET /api/inventory/reports': ['viewFinancialReports'],
} as const;

// Helper function to validate API permissions
export function validateInventoryApiPermission(
  userRole: Role,
  method: string,
  path: string
): boolean {
  const key = `${method} ${path}` as keyof typeof INVENTORY_API_PERMISSIONS;
  const requiredPermissions = INVENTORY_API_PERMISSIONS[key];
  
  if (!requiredPermissions) {
    // If no specific permissions defined, allow access
    return true;
  }
  
  return requiredPermissions.some(permission => 
    hasInventoryPermission(userRole, permission as keyof typeof INVENTORY_PERMISSIONS)
  );
}

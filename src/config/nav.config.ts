// Navigation item type definition
export interface NavItem {
  id: string;
  label: string;
  icon?: string; // SVG path string instead of ReactNode
  path?: string;
  roles: Array<'owner' | 'staff' | 'tech_admin'>;
  children?: NavItem[];
  order?: number;
  badgeId?: 'ordersCount' | 'lowStock' | 'expiringItems' | 'outOfStock';
  featureFlag?: string;
  /**
   * Marks this entry as a stub/inactive page. Sidebar should hide it by default.
   */
  stub?: boolean;
}

// Badge data hook type
export interface BadgeData {
  count: number;
  variant: 'default' | 'warning' | 'danger' | 'success';
}

// Role mapping from internal roles to navigation roles
const mapToNavRole = (internalRole: string): 'owner' | 'staff' | 'tech_admin' => {
  switch (internalRole) {
    case 'admin':
      return 'owner';
    case 'technical_admin':
      return 'tech_admin';
    case 'staff':
    default:
      return 'staff';
  }
};

// Navigation configuration for Owner/Admin view
export const navigationConfig: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    roles: ['staff', 'owner', 'tech_admin'],
    order: 1,
  },
  {
    id: 'pos',
    label: 'Point of Sale',
    path: '/pos',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    roles: ['staff', 'owner', 'tech_admin'],
    order: 2,
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    roles: ['staff', 'owner', 'tech_admin'],
    badgeId: 'ordersCount',
    order: 3,
    children: [
      {
        id: 'active-orders',
        label: 'Active Orders',
        path: '/orders/active',
        roles: ['staff', 'owner', 'tech_admin'],
        order: 1,
      },
      {
        id: 'order-history',
        label: 'Order History',
        path: '/orders/history',
        roles: ['staff', 'owner', 'tech_admin'],
        order: 2,
      },
      {
        id: 'kds',
        label: 'Kitchen Display',
        path: '/kds',
        roles: ['staff', 'owner', 'tech_admin'],
        featureFlag: 'kds',
        order: 3,
      },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['staff', 'owner', 'tech_admin'],
    order: 4,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    roles: ['owner', 'tech_admin'],
    order: 5,
    children: [
      {
        id: 'main-reports',
        label: 'Business Reports',
        path: '/reports',
        roles: ['owner', 'tech_admin'],
        order: 1,
      },
      {
        id: 'sales-reports',
        label: 'Sales Reports',
        path: '/reports/sales',
        roles: ['owner', 'tech_admin'],
        order: 2,
      },
      {
        id: 'inventory-reports',
        label: 'Inventory Reports',
        path: '/reports/inventory',
        roles: ['owner', 'tech_admin'],
        order: 3,
      },
      {
        id: 'customer-reports',
        label: 'Customer Analytics',
        path: '/reports/customers',
        roles: ['owner', 'tech_admin'],
        order: 4,
      },
      {
        id: 'z-reports',
        label: 'Z-Reports',
        path: '/reports/z-reports',
        roles: ['owner', 'tech_admin'],
        order: 5,
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    roles: ['staff', 'owner', 'tech_admin'],
    badgeId: 'lowStock',
    order: 6,
    children: [
      {
        id: 'stock-levels',
        label: 'Items',
        path: '/inventory',
        roles: ['staff', 'owner', 'tech_admin'],
        order: 1,
      },
      {
        id: 'items-management',
        label: 'Items Management',
        path: '/inventory/items',
        roles: ['owner', 'tech_admin'],
        order: 2,
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        path: '/inventory/suppliers',
        roles: ['owner', 'tech_admin'],
        order: 3,
      },
      {
        id: 'transfers',
        label: 'Transfers',
        path: '/inventory/transfers',
        roles: ['owner', 'tech_admin'],
        order: 4,
      },
      {
        id: 'counts',
        label: 'Inventory Counts',
        path: '/inventory/counts',
        roles: ['owner', 'tech_admin'],
        order: 5,
      },
      {
        id: 'count-sheets',
        label: 'Count Sheets',
        path: '/inventory/count-sheets',
        roles: ['owner', 'tech_admin'],
        order: 6,
      },
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        path: '/inventory/purchase-orders',
        roles: ['owner', 'tech_admin'],
        order: 6,
      },
      {
        id: 'cost-adjustments',
        label: 'Cost Adjustments',
        path: '/inventory/cost-adjustments',
        roles: ['owner', 'tech_admin'],
        order: 7,
        stub: true,
      },
      {
        id: 'inventory-history',
        label: 'History',
        path: '/inventory/history',
        roles: ['owner', 'tech_admin'],
        order: 8,
        stub: true,
      },
      {
        id: 'recipes',
        label: 'Recipes',
        path: '/recipes',
        roles: ['staff', 'owner', 'tech_admin'],
        order: 8,
      },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    roles: ['owner', 'tech_admin'],
    order: 7,
    children: [
      {
        id: 'menu-management',
        label: 'Menu Builder',
        path: '/settings/menu',
        roles: ['owner', 'tech_admin'],
        order: 1,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    roles: ['owner', 'tech_admin'],
    order: 8,
    children: [
      {
        id: 'general-settings',
        label: 'General',
        path: '/settings',
        roles: ['owner', 'tech_admin'],
        order: 1,
      },
      {
        id: 'tax-settings',
        label: 'Tax Settings',
        path: '/settings/tax',
        roles: ['owner', 'tech_admin'],
        order: 2,
      },
      {
        id: 'system-settings',
        label: 'System',
        path: '/settings/system',
        roles: ['tech_admin'],
        order: 3,
      },
    ],
  },
];

// Quick actions configuration
export interface QuickAction {
  id: string;
  label: string;
  icon: string; // SVG path string
  actionType: string;
  roles: Array<'owner' | 'staff' | 'tech_admin'>;
  order?: number;
}

export const quickActionsConfig: QuickAction[] = [
  {
    id: 'new-order',
    label: 'New Order',
    icon: 'M12 4v16m8-8H4',
    actionType: 'order',
    roles: ['staff', 'owner', 'tech_admin'],
    order: 1,
  },
  {
    id: 'add-customer',
    label: 'Add Customer',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    actionType: 'customer',
    roles: ['staff', 'owner', 'tech_admin'],
    order: 2,
  },
  {
    id: 'add-item',
    label: 'Add Menu Item',
    icon: 'M12 4v16m8-8H4',
    actionType: 'menu-item',
    roles: ['owner', 'tech_admin'],
    order: 3,
  },
  {
    id: 'receive-stock',
    label: 'Receive Stock',
    icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    actionType: 'stock',
    roles: ['owner', 'tech_admin'],
    order: 4,
  },
];

// Utility functions
export const filterNavItemsByRole = (
  items: NavItem[],
  userRole: string
): NavItem[] => {
  const navRole = mapToNavRole(userRole);
  
  return items
    .filter(item => item.roles.includes(navRole))
    .map(item => ({
      ...item,
      children: item.children ? filterNavItemsByRole(item.children, userRole) : undefined,
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const filterQuickActionsByRole = (
  actions: QuickAction[],
  userRole: string
): QuickAction[] => {
  const navRole = mapToNavRole(userRole);
  
  return actions
    .filter(action => action.roles.includes(navRole))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Generate breadcrumbs from navigation config
export const generateBreadcrumbs = (
  pathname: string,
  navItems: NavItem[]
): Array<{ label: string; path?: string }> => {
  const breadcrumbs: Array<{ label: string; path?: string }> = [];
  
  // Always start with Dashboard if not on dashboard
  if (pathname !== '/') {
    breadcrumbs.push({ label: 'Dashboard', path: '/' });
  }

  // Find matching nav item
  const findNavItem = (items: NavItem[], path: string): NavItem | null => {
    for (const item of items) {
      if (item.path === path) {
        return item;
      }
      if (item.children) {
        const childMatch = findNavItem(item.children, path);
        if (childMatch) {
          return childMatch;
        }
      }
    }
    return null;
  };

  // Find parent of a nav item
  const findParent = (items: NavItem[], targetId: string): NavItem | null => {
    for (const item of items) {
      if (item.children?.some(child => child.id === targetId)) {
        return item;
      }
      if (item.children) {
        const parentInChildren = findParent(item.children, targetId);
        if (parentInChildren) {
          return parentInChildren;
        }
      }
    }
    return null;
  };

  const matchedItem = findNavItem(navItems, pathname);
  if (matchedItem) {
    const parent = findParent(navItems, matchedItem.id);
    
    if (parent) {
      breadcrumbs.push({ label: parent.label, path: parent.path });
    }
    
    breadcrumbs.push({ label: matchedItem.label, path: matchedItem.path });
  }

  return breadcrumbs;
};

// Get page title from navigation config
export const getPageTitle = (
  pathname: string,
  navItems: NavItem[]
): string => {
  if (pathname === '/') {
    return 'Dashboard';
  }

  const findNavItem = (items: NavItem[]): NavItem | null => {
    for (const item of items) {
      if (item.path === pathname) {
        return item;
      }
      if (item.children) {
        const childMatch = findNavItem(item.children);
        if (childMatch) {
          return childMatch;
        }
      }
    }
    return null;
  };

  const matchedItem = findNavItem(navItems);
  return matchedItem?.label || 'Page';
};

export { mapToNavRole };

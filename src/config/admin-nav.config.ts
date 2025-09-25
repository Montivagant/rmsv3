// Unified Navigation Configuration - Comprehensive IA
// Single navigation system with dynamic role-based access

export interface NavItem {
  id: string;
  label: string;
  icon?: string; // SVG path string
  path?: string;
  roles: Array<'business_owner' | 'staff' | 'owner' | 'tech_admin'>; // Support all roles for future expansion
  children?: NavItem[] | undefined;
  order?: number;
  persistKey?: string; // Key for localStorage persistence of expanded state
}

// Icon paths for the navigation
export const NAV_ICONS = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  orders: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  customers: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  menu: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  manage: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  marketing: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  category: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  groups: 'M4 6h16M4 12h16M4 18h16',
  
  devices: 'M8 5h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2zm3 14h2m-3-16h4',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  roles: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  branches: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  items: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  // suppliers removed
  audit: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  transfers: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  history: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  adjustments: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  modifiers: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4',
  combos: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  allergens: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  clockin: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  more: 'M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z',
};

// Complete navigation configuration
export const navigationConfig: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: NAV_ICONS.dashboard,
    roles: ['business_owner'],
    order: 1,
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/orders',
    icon: NAV_ICONS.orders,
    roles: ['business_owner'],
    order: 2,
  },
  {
    id: 'pos',
    label: 'POS',
    path: '/pos',
    icon: NAV_ICONS.orders,
    roles: ['business_owner'],
    order: 2.5,
  },
  {
    id: 'kds',
    label: 'KDS',
    path: '/kds',
    icon: NAV_ICONS.orders,
    roles: ['business_owner'],
    order: 2.6,
  },
  {
    id: 'clockin',
    label: 'Clock In/Out',
    path: '/clockin',
    icon: NAV_ICONS.clockin,
    roles: ['business_owner', 'staff', 'owner', 'tech_admin'],
    order: 2.7,
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: NAV_ICONS.customers,
    roles: ['business_owner'],
    order: 3,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: NAV_ICONS.reports,
    roles: ['business_owner'],
    order: 4,
    persistKey: 'reports',
    children: [
      {
        id: 'sales-reports',
        label: 'Sales Reports',
        path: '/reports/sales',
        roles: ['business_owner'],
        order: 1,
      },
      {
        id: 'payments-reports',
        label: 'Payments Reports',
        path: '/reports/payments',
        roles: ['business_owner'],
        order: 2,
      },
      {
        id: 'inventory-reports',
        label: 'Inventory Levels',
        path: '/reports/inventory',
        roles: ['business_owner'],
        order: 3,
      },
      {
        id: 'transfers-reports',
        label: 'Transfers Report',
        path: '/reports/transfers',
        roles: ['business_owner'],
        order: 4,
      },
      {
        id: 'voids-returns',
        label: 'Voids & Returns',
        path: '/reports/voids-returns',
        roles: ['business_owner'],
        order: 5,
      },
      {
        id: 'activity-log',
        label: 'Activity Log',
        path: '/reports/activity-log',
        roles: ['business_owner'],
        order: 6,
      },
      {
        id: 'kds-report',
        label: 'KDS Report',
        path: '/reports/kds',
        roles: ['business_owner'],
        order: 9,
      },
      {
        id: 'shifts-reports',
        label: 'Shifts & Time Report',
        path: '/reports/shifts-time',
        roles: ['business_owner'],
        order: 7,
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: NAV_ICONS.inventory,
    roles: ['business_owner'],
    order: 5,
    persistKey: 'inventory',
    children: [
      {
        id: 'inventory-items',
        label: 'Items',
        path: '/inventory/items',
        icon: NAV_ICONS.items,
        roles: ['business_owner'],
        order: 1,
      },
      {
        id: 'inventory-categories',
        label: 'Categories',
        path: '/inventory/categories',
        icon: NAV_ICONS.category,
        roles: ['business_owner'],
        order: 2,
      },
      {
        id: 'inventory-item-types',
        label: 'Item Types',
        path: '/inventory/item-types',
        icon: NAV_ICONS.category,
        roles: ['business_owner'],
        order: 3,
      },
      {
        id: 'inventory-audit',
        label: 'Inventory Audit',
        path: '/inventory/audit',
        icon: NAV_ICONS.audit,
        roles: ['business_owner'],
        order: 4,
      },
      {
        id: 'inventory-transfers',
        label: 'Transfers',
        path: '/inventory/transfers',
        icon: NAV_ICONS.transfers,
        roles: ['business_owner'],
        order: 5,
      },
      {
        id: 'inventory-history',
        label: 'History',
        path: '/inventory/history',
        icon: NAV_ICONS.history,
        roles: ['business_owner'],
        order: 6,
      },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: NAV_ICONS.menu,
    roles: ['business_owner'],
    order: 6,
    persistKey: 'menu',
    children: [
      {
        id: 'menu-categories',
        label: 'Categories',
        path: '/menu/categories',
        icon: NAV_ICONS.category,
        roles: ['business_owner'],
        order: 1,
      },
      {
        id: 'menu-items',
        label: 'Menu Items',
        path: '/menu/items',
        icon: NAV_ICONS.products,
        roles: ['business_owner'],
        order: 2,
      },
      {
        id: 'menu-modifiers',
        label: 'Modifiers',
        path: '/menu/modifiers',
        icon: NAV_ICONS.modifiers,
        roles: ['business_owner'],
        order: 3,
      },
      // Combos and Allergens removed - advanced features not needed for core operations
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: NAV_ICONS.manage,
    roles: ['business_owner'],
    order: 7,
    persistKey: 'manage',
    children: [
      {
        id: 'manage-account',
        label: 'Account',
        path: '/account/profile',
        icon: NAV_ICONS.users,
        roles: ['business_owner'],
        order: 1,
      },
      {
        id: 'manage-users',
        label: 'Users',
        path: '/manage/users',
        icon: NAV_ICONS.users,
        roles: ['business_owner'],
        order: 2,
      },
      {
        id: 'manage-roles',
        label: 'Roles',
        path: '/manage/roles',
        icon: NAV_ICONS.roles,
        roles: ['business_owner'],
        order: 3,
      },
      {
        id: 'manage-branches',
        label: 'Branches',
        path: '/manage/branches',
        icon: NAV_ICONS.branches,
        roles: ['business_owner'],
        order: 4,
      },
      {
        id: 'manage-shifts',
        label: 'Shifts',
        path: '/manage/shifts',
        icon: NAV_ICONS.clockin,
        roles: ['business_owner'],
        order: 5,
      },
      // "More" section removed - vague category not needed
    ],
  },
  // Marketing module removed - not essential for core restaurant operations
];

// Utility functions for navigation
export const filterNavItemsByRole = (
  items: NavItem[],
  userRole: string
): NavItem[] => {
  return items
    .filter(item => item.roles.includes(userRole as any))
    .map(item => ({
      ...item,
      children: item.children ? filterNavItemsByRole(item.children, userRole) : undefined,
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Get expanded sections from localStorage
export const getExpandedSections = (): Set<string> => {
  try {
    const saved = localStorage.getItem('dashup-admin-nav-expanded');
    return saved ? new Set(JSON.parse(saved)) : new Set(['reports', 'inventory']);
  } catch {
    return new Set(['reports', 'inventory']);
  }
};

// Save expanded sections to localStorage
export const saveExpandedSections = (expandedSections: Set<string>): void => {
  try {
    localStorage.setItem('dashup-admin-nav-expanded', JSON.stringify(Array.from(expandedSections)));
  } catch {
    // Silent fail for localStorage issues
  }
};

// Generate breadcrumbs from navigation config
export const generateBreadcrumbs = (
  pathname: string,
  navItems: NavItem[]
): Array<{ label: string; path?: string | undefined }> => {
  const breadcrumbs: Array<{ label: string; path?: string | undefined }> = [];

  const findNavItem = (items: NavItem[]): NavItem | null => {
    for (const item of items) {
      if (item.path === pathname) {
        return item;
      }
      if (item.children) {
        const childMatch = findNavItem(item.children);
        if (childMatch) {
          // Add parent to breadcrumbs if it has a path
          if (item.path) {
            breadcrumbs.push({ label: item.label, path: item.path });
          }
          return childMatch;
        }
      }
    }
    return null;
  };

  const matchedItem = findNavItem(navItems);
  if (matchedItem) {
    breadcrumbs.push({ label: matchedItem.label, path: matchedItem.path });
  }

  return breadcrumbs;
};

// Get page title from navigation config
export const getPageTitle = (
  pathname: string,
  navItems: NavItem[]
): string => {
  if (pathname === '/' || pathname === '/dashboard') {
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

export default navigationConfig;





import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';

interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  badge?: number | string;
  children?: NavItem[];
  requiredRoles?: string[];
  action?: () => void;
}

interface AppNavProps {
  userRole?: 'admin' | 'technical_admin' | 'staff';
  onNewAction?: (actionType: string) => void;
  collapsed?: boolean;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'pos',
    label: 'Point of Sale',
    path: '/pos',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    requiredRoles: ['staff', 'admin', 'technical_admin'],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    badge: '3',
    children: [
      { id: 'active-orders', label: 'Active Orders', path: '/orders/active' },
      { id: 'order-history', label: 'Order History', path: '/orders/history' },
      { id: 'kds', label: 'Kitchen Display', path: '/kds' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    children: [
      { id: 'stock-levels', label: 'Stock Levels', path: '/inventory' },
      { id: 'suppliers', label: 'Suppliers', path: '/inventory/suppliers', requiredRoles: ['admin', 'technical_admin'] },
      { id: 'purchase-orders', label: 'Purchase Orders', path: '/inventory/orders', requiredRoles: ['admin', 'technical_admin'] },
      { id: 'recipes', label: 'Recipes', path: '/recipes' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    requiredRoles: ['admin', 'technical_admin'],
    children: [
      { id: 'sales-reports', label: 'Sales Reports', path: '/reports/sales' },
      { id: 'inventory-reports', label: 'Inventory Reports', path: '/reports/inventory' },
      { id: 'customer-reports', label: 'Customer Analytics', path: '/reports/customers' },
      { id: 'z-reports', label: 'Z-Reports', path: '/reports/z-reports' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    requiredRoles: ['admin', 'technical_admin'],
    children: [
      { id: 'general', label: 'General', path: '/settings' },
      { id: 'menu-management', label: 'Menu Management', path: '/settings/menu', requiredRoles: ['admin', 'technical_admin'] },
      { id: 'tax-settings', label: 'Tax Settings', path: '/settings/tax', requiredRoles: ['admin', 'technical_admin'] },
      { id: 'system', label: 'System', path: '/settings/system', requiredRoles: ['technical_admin'] },
    ],
  },
];

const quickActions = [
  { id: 'new-order', label: 'New Order', icon: 'M12 4v16m8-8H4', actionType: 'order', requiredRoles: ['staff', 'admin', 'technical_admin'] },
  { id: 'add-customer', label: 'Add Customer', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', actionType: 'customer' },
  { id: 'add-item', label: 'Add Menu Item', icon: 'M12 4v16m8-8H4', actionType: 'menu-item', requiredRoles: ['admin', 'technical_admin'] },
  { id: 'receive-stock', label: 'Receive Stock', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', actionType: 'stock', requiredRoles: ['admin', 'technical_admin'] },
];

export const AppNav: React.FC<AppNavProps> = ({ userRole = 'staff', onNewAction, collapsed = false }) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showQuickActions, setShowQuickActions] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const quickActionsTriggerRef = useRef<HTMLButtonElement>(null);
  const quickActionsPanelRef = useRef<HTMLDivElement>(null);
  const { layerRef: quickActionsLayerRef } = useDismissableLayer({
    isOpen: showQuickActions,
    onDismiss: () => setShowQuickActions(false),
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: quickActionsTriggerRef,
    id: 'appnav-quick-actions',
    closeOthersOnOpen: true,
  });

  // Check if user has access to a nav item
  const hasAccess = (item: NavItem): boolean => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    
    const roleHierarchy: Record<string, number> = {
      staff: 1,
      admin: 2,
      technical_admin: 3,
    };
    
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = Math.min(...item.requiredRoles.map(role => roleHierarchy[role] || Infinity));
    
    return userLevel >= requiredLevel;
  };

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(hasAccess).map(item => ({
    ...item,
    children: item.children?.filter(hasAccess),
  }));

  // Filter quick actions based on user role
  const filteredQuickActions = quickActions.filter(hasAccess);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Check if current path is active
  const isActive = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Check if any child is active
  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => isActive(child.path));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (navRef.current && document.activeElement?.closest('nav') === navRef.current) {
        const navItems = navRef.current.querySelectorAll<HTMLElement>('a[href], button, [role="button"]');
        const currentIndex = Array.from(navItems).indexOf(document.activeElement as HTMLElement);
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
            navItems[nextIndex]?.focus();
            break;
          case 'ArrowUp':
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
            navItems[prevIndex]?.focus();
            break;
          case 'Home':
            e.preventDefault();
            navItems[0]?.focus();
            break;
          case 'End':
            e.preventDefault();
            navItems[navItems.length - 1]?.focus();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-expand active groups
  useEffect(() => {
    filteredNavItems.forEach(item => {
      if (item.children && hasActiveChild(item)) {
        setExpandedGroups(prev => new Set(prev).add(item.id));
      }
    });
  }, [location.pathname]);

  const renderIcon = (iconPath: string) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const isCurrentActive = isActive(item.path);
    const hasActiveDescendant = hasActiveChild(item);

    if (hasChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            aria-expanded={collapsed ? false : isExpanded}
            aria-controls={`nav-group-${item.id}`}
            onClick={() => { if (!collapsed) toggleGroup(item.id); }}
            className={`
              w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 text-sm font-medium rounded-md
              transition-colors focus-ring
              ${hasActiveDescendant 
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' 
                : 'text-text-secondary hover:bg-surface-secondary'
              }
            `}
          >
            <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
              {item.icon && renderIcon(item.icon)}
              <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
              {(!collapsed && item.badge) && (
                <span className="badge badge-primary">{item.badge}</span>
              )}
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''} ${collapsed ? 'hidden' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!collapsed && isExpanded && (
            <div id={`nav-group-${item.id}`} className="ml-8 space-y-1">
              {item.children.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.path!}
        aria-current={isCurrentActive ? 'page' : undefined}
        title={item.label}
        aria-label={item.label}
        className={({ isActive }) => `
          flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2 text-sm font-medium rounded-md
          transition-colors focus-ring
          ${isActive 
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200' 
            : 'text-text-secondary hover:bg-surface-secondary'
          }
        `}
      >
        {item.icon && renderIcon(item.icon)}
        <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
        {(!collapsed && item.badge) && (
          <span className="badge badge-secondary ml-auto">{item.badge}</span>
        )}
      </NavLink>
    );
  };

  return (
    <nav
      ref={navRef}
      className="flex flex-col h-full bg-surface border-r border-primary overflow-visible z-[60]"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo/Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-secondary">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-inverse font-bold text-lg">R</span>
          </div>
          {!collapsed && <span className="text-lg font-semibold text-primary">RMS v3</span>}
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 py-3">
        <div className="relative z-[60]">
          <button
            ref={quickActionsTriggerRef}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`${collapsed ? 'px-0 py-2 justify-center' : 'w-full'} btn btn-primary btn-md flex items-center space-x-2 focus-ring`}
            aria-expanded={showQuickActions}
            aria-haspopup="menu"
            title="New"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className={collapsed ? 'sr-only' : ''}>New</span>
          </button>
          
          {showQuickActions && (
            <div
              ref={(node) => { quickActionsPanelRef.current = node!; (quickActionsLayerRef as any).current = node; }}
              className={`${collapsed ? 'absolute left-full ml-2 top-0 mt-2 w-56' : 'absolute top-full left-0 right-0 mt-2'} bg-surface rounded-lg shadow-lg border border-secondary z-[70]`}
              role="menu"
              aria-orientation="vertical"
            >
              {filteredQuickActions.map(action => (
                <button
                  key={action.id}
                  role="menuitem"
                  onClick={() => {
                    onNewAction?.(action.actionType);
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-surface-secondary first:rounded-t-lg last:rounded-b-lg"
                >
                  {action.icon && renderIcon(action.icon)}
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-4'} py-2 space-y-1 scrollbar-thin`}>
        {filteredNavItems.map(item => renderNavItem(item))}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-secondary">
          <div className="text-xs text-secondary">
            Role: <span className="font-medium capitalize">{userRole.replace('_', ' ')}</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default AppNav;

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '../rbac/roles';
import { Sidebar } from './navigation/Sidebar';
import { MobileNavDrawer } from './navigation/MobileNavDrawer';
import { TopBar } from './navigation/TopBar';
import { NavigationBreadcrumb } from './navigation/NavigationBreadcrumb';
import { OfflineBanner } from './OfflineBanner';
import { SyncStatusBadge } from './SyncStatusIndicator';
import { PerformanceBadge } from './PerformanceMonitor';
import { getPerformanceMetrics } from '../bootstrap/persist';
import { useUI } from '../store/ui';
import { useTheme } from './providers/ThemeProvider';

export function Layout() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();
  const { isDarkMode, toggleTheme } = useTheme();

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifications] = useState(3); // Mock notification count

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
  };

  const handleProfileAction = (action: string) => {
    switch (action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'help':
        navigate('/help');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  const handleNewAction = (actionType: string) => {
    switch (actionType) {
      case 'order':
        navigate('/pos');
        break;
      case 'customer':
        navigate('/customers/new');
        break;
      case 'menu-item':
        navigate('/settings/menu/new');
        break;
      case 'stock':
        navigate('/inventory/receive');
        break;
      default:
        console.log('Unknown action:', actionType);
    }
  };

  // Map user role for type safety
  const getUserRole = () => {
    if (!currentUser) return 'staff';
    const roleMap: Record<string, 'admin' | 'technical_admin' | 'staff'> = {
      'Admin': 'admin',
      'Technical Admin': 'technical_admin',
      'Staff': 'staff',
    };
    return roleMap[currentUser.role] || 'staff';
  };

  const userRole = getUserRole();

  return (
    <>
      <OfflineBanner />
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <div 
          className={`
            hidden lg:flex transition-all duration-300 flex-shrink-0
            ${sidebarCollapsed ? 'w-16' : 'w-64'}
          `}
        >
          <div className="h-full relative">
            <Sidebar
              userRole={userRole}
              onNewAction={handleNewAction}
              collapsed={sidebarCollapsed}
            />
            
            {/* Collapse button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute top-20 -right-3 w-6 h-6 bg-surface border border-border-secondary rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-50"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg 
                className={`w-3 h-3 text-text-secondary transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <MobileNavDrawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          userRole={userRole}
          onNewAction={handleNewAction}
        />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <TopBar
            userName={currentUser?.name || 'Guest'}
            userRole={currentUser?.role || 'Staff'}
            notifications={notifications}
            onSearch={handleSearch}
            onThemeToggle={toggleTheme}
            onProfileAction={handleProfileAction}
            isDarkMode={isDarkMode}
            onMobileMenuToggle={() => setMobileDrawerOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          
          {/* Performance and Sync Status Bar */}
          <div className="bg-surface border-b border-border-primary px-4 sm:px-6 py-2">
            <div className="flex items-center justify-between">
              <NavigationBreadcrumb />
              <div className="flex items-center space-x-4">
                <PerformanceBadge 
                  getMetrics={getPerformanceMetrics} 
                  className="text-sm"
                />
                <SyncStatusBadge className="text-sm" />
              </div>
            </div>
          </div>
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Layout;

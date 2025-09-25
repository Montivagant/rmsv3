import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '../rbac/roles';
import { TopBar } from './navigation/TopBar';
import { Sidebar } from './navigation/Sidebar';
import { MobileNavDrawer } from './navigation/MobileNavDrawer';
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
  const [mobileOpen, setMobileOpen] = useState(false);

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
        navigate('/account/profile');
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

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Map user role for type safety
  const getUserRole = () => {
    if (!currentUser) return 'business_owner';
    const role = currentUser.role || 'BUSINESS_OWNER';
    if (role === 'BUSINESS_OWNER') {
      return 'business_owner';
    }
    return 'business_owner';
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
              collapsed={sidebarCollapsed}
            />
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <MobileNavDrawer
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          userRole={userRole}
        />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <TopBar
            userName={currentUser?.name || 'Guest'}
            userRole={currentUser?.role || 'Staff'}
            onSearch={handleSearch}
            onThemeToggle={toggleTheme}
            onProfileAction={handleProfileAction}
            isDarkMode={isDarkMode}
            onMobileMenuToggle={() => setMobileOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={handleToggleSidebar}
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
          <main className="flex-1 overflow-y-auto bg-surface-primary">
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

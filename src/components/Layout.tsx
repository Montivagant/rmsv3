import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '../rbac/roles';
import { Button } from './Button';
import { Breadcrumb } from './Breadcrumb';
import { OfflineBanner } from './OfflineBanner';
import { SyncStatusBadge } from './SyncStatusIndicator';
import { PerformanceBadge } from './PerformanceMonitor';
import { getPerformanceMetrics } from '../bootstrap/persist';
import { useUI } from '../store/ui';
import { useFlags } from '../store/flags';



export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();
  const { flags } = useFlags();
  
  // Create navigation array with conditional KDS
  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'POS', href: '/pos', icon: '🛒' },
    ...(flags.kds ? [{ name: 'KDS', href: '/kds', icon: '👨‍🍳' }] : []),
    { name: 'Inventory', href: '/inventory', icon: '📦' },
    { name: 'Customers', href: '/customers', icon: '👥' },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference to localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  return (
    <>
      <OfflineBanner />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 shadow-lg transition-all duration-300`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                RMS v3
              </h1>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4 sidebar" aria-label="Main">
            {navigation
              .filter((item) => {
                // Filter out KDS if disabled
                if (item.href === '/kds' && !flags.kds) {
                  return false;
                }
                return true;
              })
              .map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-link ${
                      isActive ? 'active' : ''
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <span className="text-lg mr-3 flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
          </nav>
          
          {/* User info */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {!sidebarCollapsed && currentUser && (
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentUser.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className={`${sidebarCollapsed ? 'pl-16' : 'pl-64'} transition-all duration-300`}>
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Performance badge */}
              <PerformanceBadge 
                getMetrics={getPerformanceMetrics} 
                className="p-2" 
              />
              
              {/* Sync status indicator */}
              <SyncStatusBadge className="p-2" />
              
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              
              {/* User menu */}
              {currentUser && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {currentUser.name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 main-content">
            <Breadcrumb />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
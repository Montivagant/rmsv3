import React, { useState, useRef, useEffect } from 'react';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { useFocusTrap } from '../ui/KeyboardNavigation';

interface TopBarProps {
  userName?: string;
  userRole?: string;
  notifications?: number;
  onSearch?: (query: string) => void;
  onThemeToggle?: () => void;
  onProfileAction?: (action: string) => void;
  isDarkMode?: boolean;
  onMobileMenuToggle?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  userName = 'User',
  userRole = 'Staff',
  notifications = 0,
  onSearch,
  onThemeToggle,
  onProfileAction,
  isDarkMode = false,
  onMobileMenuToggle,
  sidebarCollapsed = false,
  onSidebarToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  // Dismiss behavior for the search overlay
  const { layerRef: searchLayerRef } = useDismissableLayer({
    isOpen: showSearch,
    onDismiss: () => {
      setShowSearch(false);
      setSearchQuery('');
    },
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: searchTriggerRef,
  });

  const { layerRef: notifLayerRef } = useDismissableLayer({
    isOpen: showNotifications,
    onDismiss: () => setShowNotifications(false),
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: notifTriggerRef,
  });

  const { layerRef: profileLayerRef } = useDismissableLayer({
    isOpen: showProfile,
    onDismiss: () => setShowProfile(false),
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: profileTriggerRef,
  });


  // Focus trap for search overlay
  const { SentinelStart, SentinelEnd } = useFocusTrap(searchPanelRef, {
    active: showSearch,
    initialFocus: () => searchInputRef.current,
    returnFocus: true,
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const mockNotifications = [
    { id: 1, type: 'order', message: 'New order #1234 received', time: '2 min ago' },
    { id: 2, type: 'stock', message: 'Low stock alert: Burger Buns', time: '15 min ago' },
    { id: 3, type: 'system', message: 'Daily backup completed', time: '1 hour ago' },
  ];

  return (
    <>
      <header className="h-16 bg-surface border-b border-border-secondary flex items-center justify-between px-4 sm:px-6">
        {/* Left section - Mobile menu and Search */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button - only visible on mobile */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 text-text-secondary hover:bg-surface-secondary rounded-md transition-colors focus-ring"
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop sidebar toggle - only visible on desktop when sidebar is present */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="hidden lg:flex p-2 text-text-secondary hover:bg-surface-secondary rounded-md transition-colors focus-ring"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg 
                className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <button
            ref={searchTriggerRef}
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-secondary bg-surface-secondary rounded-md hover:bg-surface-tertiary transition-colors focus-ring"
            aria-label="Search (Cmd+K)"
            aria-haspopup="dialog"
            aria-expanded={showSearch}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-tertiary bg-surface-secondary rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 text-secondary hover:bg-surface-secondary rounded-md transition-colors focus-ring"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <button
              ref={notifTriggerRef}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-secondary hover:bg-surface-secondary rounded-md transition-colors focus-ring"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div
                ref={(node) => { notificationRef.current = node!; (notifLayerRef as any).current = node; }}
                className="absolute right-0 mt-2 w-80 bg-surface rounded-lg shadow-lg border border-secondary z-dropdown"
              >
                <div className="px-4 py-3 border-b border-secondary">
                  <h3 className="text-sm font-semibold text-primary">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className="px-4 py-3 hover:bg-surface-secondary border-b border-secondary last:border-0"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`
                          w-2 h-2 mt-1.5 rounded-full
                          ${notification.type === 'order' ? 'bg-primary-500' : ''}
                          ${notification.type === 'stock' ? 'bg-warning-500' : ''}
                          ${notification.type === 'system' ? 'bg-success-500' : ''}
                        `}></div>
                        <div className="flex-1">
                          <p className="text-sm text-primary">{notification.message}</p>
                          <p className="text-xs text-secondary mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-secondary">
                  <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div ref={profileRef} className="relative">
            <button
              ref={profileTriggerRef}
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 text-secondary hover:bg-surface-secondary rounded-md transition-colors focus-ring"
              aria-expanded={showProfile}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-secondary">{userRole}</p>
              </div>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showProfile && (
              <div
                ref={(node) => { profileRef.current = node!; (profileLayerRef as any).current = node; }}
                className="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg border border-secondary z-dropdown"
              >
                <div className="px-4 py-3 border-b border-secondary">
                  <p className="text-sm font-medium text-primary">{userName}</p>
                  <p className="text-xs text-secondary">{userRole}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      onProfileAction?.('profile');
                      setShowProfile(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-surface-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Your Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onProfileAction?.('settings');
                      setShowProfile(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-surface-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      onProfileAction?.('help');
                      setShowProfile(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-surface-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Help & Support</span>
                  </button>
                </div>
                <div className="py-1 border-t border-secondary">
                  <button
                    onClick={() => {
                      onProfileAction?.('logout');
                      setShowProfile(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-surface-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-modal-backdrop flex items-start justify-center pt-20">
          <div
            ref={(node) => { searchPanelRef.current = node!; (searchLayerRef as any).current = node; }}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="bg-surface rounded-lg shadow-xl w-full max-w-2xl mx-4 outline-none"
          >
            <SentinelStart />
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, customers, products..."
                className="w-full px-6 py-4 text-lg bg-transparent border-0 focus:outline-none text-primary placeholder:text-muted"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                aria-label="Close search"
              >
                <kbd className="px-2 py-1 text-xs bg-surface-secondary rounded">ESC</kbd>
              </button>
            </form>
            {searchQuery && (
              <div className="px-6 py-4 border-t border-secondary">
                <p className="text-sm text-tertiary">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-surface-secondary rounded">Enter</kbd> to search
                </p>
              </div>
            )}
            <SentinelEnd />
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;

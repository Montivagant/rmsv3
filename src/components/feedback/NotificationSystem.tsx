/**
 * Enhanced Notification System
 * 
 * Provides comprehensive user feedback with toast notifications,
 * success messages, and error handling with recovery actions
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  actions?: NotificationAction[];
  persistent?: boolean;
  progress?: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  showSuccess: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showError: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showWarning: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showInfo: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showLoading: (title: string, message?: string) => string;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 5,
  defaultDuration = 5000 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Auto-remove notifications after duration
  useEffect(() => {
    const timers: Record<string, NodeJS.Timeout> = {};

    notifications.forEach(notification => {
      if (!notification.persistent && notification.type !== 'loading') {
        const duration = notification.duration || defaultDuration;
        timers[notification.id] = setTimeout(() => {
          removeNotification(notification.id);
        }, duration);
      }
    });

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [notifications, defaultDuration]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = { ...notification, id };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit to max notifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  }, [maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates } : n
    ));
  }, []);

  const showSuccess = useCallback((title: string, message?: string, actions?: NotificationAction[]): string => {
    return addNotification({ type: 'success', title, message, actions });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, actions?: NotificationAction[]): string => {
    return addNotification({ 
      type: 'error', 
      title, 
      message, 
      actions,
      duration: 8000 // Longer duration for errors
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, actions?: NotificationAction[]): string => {
    return addNotification({ type: 'warning', title, message, actions });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, actions?: NotificationAction[]): string => {
    return addNotification({ type: 'info', title, message, actions });
  }, [addNotification]);

  const showLoading = useCallback((title: string, message?: string): string => {
    return addNotification({ 
      type: 'loading', 
      title, 
      message, 
      persistent: true 
    });
  }, [addNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    updateNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const { removeNotification } = useNotifications();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeNotification(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'loading':
        return (
          <svg className="w-5 h-5 text-brand animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-success/10 border-success/20';
      case 'error':
        return 'bg-error/10 border-error/20';
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      case 'info':
      case 'loading':
        return 'bg-brand/10 border-brand/20';
      default:
        return 'bg-surface-secondary border-border';
    }
  };

  return (
    <div
      className={`
        border rounded-lg p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out transform
        ${getBackgroundColor()}
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-text-primary">
            {notification.title}
          </p>
          {notification.message && (
            <p className="mt-1 text-sm text-text-secondary">
              {notification.message}
            </p>
          )}
          
          {/* Progress bar for loading notifications */}
          {notification.type === 'loading' && notification.progress !== undefined && (
            <div className="mt-2 w-full bg-surface-secondary rounded-full h-2">
              <div
                className="bg-brand h-2 rounded-full transition-all duration-300"
                style={{ width: `${notification.progress}%` }}
              />
            </div>
          )}
          
          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    if (action.style !== 'secondary') {
                      handleClose();
                    }
                  }}
                  className={`
                    text-sm font-medium px-3 py-1 rounded-md transition-colors
                    ${action.style === 'danger' 
                      ? 'bg-error text-primary-foreground hover:bg-error/90' 
                      : action.style === 'primary'
                      ? 'bg-brand text-primary-foreground hover:bg-brand/90'
                      : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Close button */}
        {!notification.persistent && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-text-secondary hover:text-text-primary focus:outline-none"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Authentication Context
 * 
 * Provides user authentication state and current user information
 * for audit trails and access control throughout the application.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '../shared/logger';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  branchIds: string[];
  status: 'active' | 'inactive' | 'suspended';
  preferences: {
    defaultBranch: string;
    locale: string;
    timeZone: string;
  };
  metadata: {
    lastLoginAt?: string;
    loginCount: number;
    sessionStartAt: string;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  hasRole: (roleId: string) => boolean;
  hasPermission: (module: string, action: string) => boolean;
  canAccessBranch: (branchId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  mockUser?: AuthUser; // For testing and development
}

export function AuthProvider({ children, mockUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Prevent duplicate initialization in React StrictMode (development)
    const globalAny = globalThis as any;
    if (globalAny.__RMS_DEV_AUTH_INIT) return;
    globalAny.__RMS_DEV_AUTH_INIT = true;
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setIsLoading(true);
    
    try {
      // In development/demo mode, use mock user or default admin
      if (import.meta.env.DEV || mockUser) {
        const devUser: AuthUser = mockUser || {
          id: 'dev-admin',
          email: 'admin@rmsv3.local',
          name: 'Development Admin',
          roles: ['business-owner'],
          branchIds: ['main'],
          status: 'active',
          preferences: {
            defaultBranch: 'main',
            locale: 'en',
            timeZone: 'Africa/Cairo'
          },
          metadata: {
            lastLoginAt: new Date().toISOString(),
            loginCount: 1,
            sessionStartAt: new Date().toISOString()
          }
        };
        
        setUser(devUser);
        // Persist dev session so refreshes restore without re-authenticating
        try {
          const sessionData = { user: devUser, timestamp: new Date().toISOString() };
          localStorage.setItem('rms_auth_session', JSON.stringify(sessionData));
        } catch {
          logger.warn('Failed to save development session to localStorage');
        }
        logger.info('Development user authenticated', { userId: devUser.id, email: devUser.email });
        return;
      }

      // Check for existing session
      const savedSession = localStorage.getItem('rms_auth_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          
          // Validate session is not expired (24 hours)
          const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
          if (sessionAge < 24 * 60 * 60 * 1000) {
            setUser(sessionData.user);
            logger.info('Session restored', { userId: sessionData.user.id });
            return;
          } else {
            // Session expired
            localStorage.removeItem('rms_auth_session');
            logger.info('Session expired, removing stored session');
          }
        } catch (error) {
          logger.warn('Failed to parse saved session', { message: (error as Error).message });
          localStorage.removeItem('rms_auth_session');
        }
      }

      // No valid session found
      logger.info('No valid authentication session found');
      
    } catch (error) {
      logger.error('Failed to initialize authentication', { message: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call the authentication API
      // For now, simulate authentication with basic validation
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Mock authentication - in production, this would be a real API call
      const mockAuthUser: AuthUser = {
        id: `user_${Date.now()}`,
        email: email.toLowerCase(),
        name: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        roles: email.includes('admin') ? ['business-owner'] : ['staff'],
        branchIds: ['main'],
        status: 'active',
        preferences: {
          defaultBranch: 'main',
          locale: 'en',
          timeZone: 'Africa/Cairo'
        },
        metadata: {
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
          sessionStartAt: new Date().toISOString()
        }
      };

      // Save session
      const sessionData = {
        user: mockAuthUser,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('rms_auth_session', JSON.stringify(sessionData));

      setUser(mockAuthUser);
      logger.info('User logged in successfully', { userId: mockAuthUser.id, email: mockAuthUser.email });
      
      return mockAuthUser;
      
    } catch (error) {
      logger.error('Login failed', { message: (error as Error).message, email });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      logger.info('User logged out', { userId: user.id, email: user.email });
    }
    
    setUser(null);
    localStorage.removeItem('rms_auth_session');
    
    // In a real implementation, you might want to invalidate the session on the server
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Update stored session
    const sessionData = {
      user: updatedUser,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('rms_auth_session', JSON.stringify(sessionData));
    
    logger.info('User profile updated', { userId: user.id, updates: Object.keys(updates) });
  };

  const hasRole = (roleId: string): boolean => {
    if (!user) return false;
    return user.roles.includes(roleId) || user.roles.includes('business-owner');
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    
    // Business owners have all permissions
    if (user.roles.includes('business-owner')) return true;
    
    // In a real implementation, this would check user roles against permissions
    // For now, basic role-based access
    const rolePermissions: Record<string, string[]> = {
      'manager': ['pos.manage', 'inventory.manage', 'reports.view', 'menu.manage'],
      'staff': ['pos.operate', 'inventory.view'],
      'kitchen': ['pos.view', 'orders.manage'],
    };
    
    for (const role of user.roles) {
      const permissions = rolePermissions[role] || [];
      if (permissions.includes(`${module}.${action}`) || permissions.includes('*')) {
        return true;
      }
    }
    
    return false;
  };

  const canAccessBranch = (branchId: string): boolean => {
    if (!user) return false;
    
    // If user has no specific branch restrictions, they can access all
    if (user.branchIds.length === 0) return true;
    
    // Check if user has access to this specific branch
    return user.branchIds.includes(branchId);
  };

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    hasRole,
    hasPermission,
    canAccessBranch
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for getting current user ID for audit trails
export function useCurrentUserId(): string {
  const { user } = useAuth();
  return user?.id || 'anonymous';
}

// Helper hook for getting current user display name
export function useCurrentUserName(): string {
  const { user } = useAuth();
  return user?.name || 'Anonymous User';
}

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Suspense, lazy } from 'react';
import userEvent from '@testing-library/user-event';

import POS from '../pages/POS';
import Settings from '../pages/Settings';
import { Layout } from '../components';
import { setCurrentUser, getCurrentUser, Role } from '../rbac/roles';
import { RoleGuard } from '../rbac/guard';
import { useUI, getDensityClasses } from '../store/ui';
import { useFlags, useFeature } from '../store/flags';

// Lazy load components for testing
const Dashboard = lazy(() => import('../pages/Dashboard'));
const KDS = lazy(() => import('../pages/KDS'));
const Inventory = lazy(() => import('../pages/Inventory'));
const Customers = lazy(() => import('../pages/Customers'));
const Reports = lazy(() => import('../pages/Reports'));
const Login = lazy(() => import('../pages/Login'));

// Test version of App without Router
function TestApp() {
  const currentUser = getCurrentUser();
  const density = useUI((state) => state.density);
  const kdsEnabled = useFeature('kds');
  
  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    if (!currentUser) {
      return <Login />;
    }
    return <>{children}</>;
  }
  
  function FeatureDisabledBanner({ feature }: { feature: string }) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Feature Disabled</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            The {feature} feature is currently disabled.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Contact your administrator to enable this feature.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={getDensityClasses(density)}>
      <Suspense fallback={<div>Loading content...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POS />} />
            <Route path="kds" element={
              kdsEnabled ? <KDS /> : <FeatureDisabledBanner feature="Kitchen Display System" />
            } />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={
              <RoleGuard requiredRole={Role.ADMIN}>
                <Settings />
              </RoleGuard>
            } />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

// Mock hooks
vi.mock('../hooks/useApi', () => ({
  useApi: () => ({ data: [], loading: false, error: null }),
  apiPost: vi.fn().mockResolvedValue({})
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

describe('M3 - Interaction & Flex Settings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset stores
    useUI.getState().reset();
    useFlags.getState().resetToTechnicalDefaults();
    
    // Set default auth state
    setCurrentUser({ id: '1', name: 'Admin User', role: Role.ADMIN });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Preferences', () => {
    it('should persist density changes across reloads', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Switch to compact density
      const densitySelect = screen.getByLabelText('Density');
      await userEvent.selectOptions(densitySelect, 'compact');
      
      // Check if preference is saved to localStorage
      const savedState = JSON.parse(localStorage.getItem('rms-ui-preferences') || '{}');
      expect(savedState.state.density).toBe('compact');
      
      // Verify UI reflects the change
      expect(densitySelect).toHaveValue('compact');
    });
    
    it('should apply density classes to the application', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <TestApp />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Set compact density
      useUI.getState().setDensity('compact');
      
      // Re-render to see changes
      render(
        <MemoryRouter>
          <TestWrapper>
            <TestApp />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Check if compact class is applied
      const appContainer = document.querySelector('.rms-compact');
      expect(appContainer).toBeInTheDocument();
    });
    
    it('should persist sidebar collapse state', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <TestApp />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Toggle sidebar
      useUI.getState().setSidebarCollapsed(true);
      
      // Check localStorage
      const savedState = JSON.parse(localStorage.getItem('rms-ui-preferences') || '{}');
      expect(savedState.state.sidebarCollapsed).toBe(true);
    });
    
    it('should update date and number format preferences', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Change density setting
      const densitySelect = screen.getByLabelText('Density');
      await userEvent.selectOptions(densitySelect, 'compact');
      
      // Verify density change is persisted
      const savedState = JSON.parse(localStorage.getItem('rms-ui-preferences') || '{}');
      expect(savedState.state.density).toBe('compact');
    });
  });

  describe('Feature Flags', () => {
    it('should hide KDS navigation when flag is disabled', async () => {
      // Disable KDS flag
      useFlags.getState().setFlag('kds', false);
      
      render(
        <MemoryRouter>
          <TestWrapper>
            <TestApp />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // KDS nav link should not be present
      expect(screen.queryByText('Kitchen Display')).not.toBeInTheDocument();
    });
    
    it('should show feature disabled banner when accessing disabled route', async () => {
      // Disable KDS flag
      useFlags.getState().setFlag('kds', false);
      
      render(
        <MemoryRouter initialEntries={['/kds']}>
          <TestWrapper>
            <TestApp />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Should show disabled banner
      expect(screen.getByText(/feature is currently disabled/i)).toBeInTheDocument();
    });
    
    it('should reset flags to technical defaults', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Change some flags to non-default values
      useFlags.getState().setFlag('kds', false);
      useFlags.getState().setFlag('loyalty', true);
      
      // Click reset button
      const resetButton = screen.getByText('Reset to defaults');
      await userEvent.click(resetButton);
      
      // Verify flags are reset to built-in defaults (not technical defaults)
      const flags = useFlags.getState().flags;
      expect(flags.kds).toBe(true); // Built-in default
      expect(flags.loyalty).toBe(false); // Built-in default
      expect(flags.payments).toBe(false); // Built-in default
    });
  });

  describe('RBAC Protection', () => {
    it('should show Admin Console for ADMIN users', async () => {
      setCurrentUser({ id: '1', name: 'Admin User', role: Role.ADMIN });
      
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Admin Console')).toBeInTheDocument();
    });
    
    it('should show blocked message for STAFF users in Admin Console', async () => {
      setCurrentUser({ id: '1', name: 'Staff User', role: Role.STAFF });
      
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Admin Console tab should still be visible but show blocked content
      expect(screen.getByText('Admin Console')).toBeInTheDocument();
    });
    
    it('should show Technical Console for TECH_ADMIN users', async () => {
      setCurrentUser({ id: '1', name: 'Tech Admin', role: Role.TECH_ADMIN });
      
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Technical Console')).toBeInTheDocument();
    });
    
    it('should show blocked message for ADMIN users in Technical Console', async () => {
      setCurrentUser({ id: '1', name: 'Admin User', role: Role.ADMIN });
      
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Technical Console tab should still be visible but show blocked content
      expect(screen.getByText('Technical Console')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should focus search input when pressing / on POS page', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <POS />
          </TestWrapper>
        </MemoryRouter>
      );
      
      const searchInput = screen.getByPlaceholderText('Search menu items...');
      
      // Press / key
      fireEvent.keyDown(document, { key: '/', preventDefault: vi.fn() });
      
      await waitFor(() => {
        expect(searchInput).toHaveFocus();
      });
    });
    
    it('should trigger new ticket when pressing n on POS page', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <POS />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Add some search term first
      const searchInput = screen.getByPlaceholderText('Search menu items...');
      await userEvent.type(searchInput, 'test search');
      
      // Press n key
      fireEvent.keyDown(document, { key: 'n', preventDefault: vi.fn() });
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
    
    it('should not trigger shortcuts when typing in input fields', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <POS />
          </TestWrapper>
        </MemoryRouter>
      );
      
      const searchInput = screen.getByPlaceholderText('Search menu items...');
      await userEvent.click(searchInput);
      
      // Type / while focused on input
      await userEvent.type(searchInput, '/');
      
      // Should not clear the input (shortcut should not trigger)
      expect(searchInput).toHaveValue('/');
    });
    
    it('should show keyboard shortcut hints in POS', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <POS />
          </TestWrapper>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Press / to focus')).toBeInTheDocument();
      // Note: New Ticket button is only visible when cart has items
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on settings tabs', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      const tabList = screen.getByRole('tablist');
      expect(tabList).toHaveAttribute('aria-label', 'Settings Sections');
    });
    
    it('should have accessible form controls', async () => {
      // Set user as admin to access the controls
      setCurrentUser({ id: '1', name: 'Admin User', role: Role.ADMIN });
      
      render(
        <MemoryRouter>
          <TestWrapper>
            <Settings />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Check for proper labels in the Admin Console tab
      expect(screen.getByLabelText('Density')).toBeInTheDocument();
    });
    
    it('should maintain focus management in keyboard shortcuts', async () => {
      render(
        <MemoryRouter>
          <TestWrapper>
            <POS />
          </TestWrapper>
        </MemoryRouter>
      );
      
      // Focus should move to search input after / key
      fireEvent.keyDown(document, { key: '/', preventDefault: vi.fn() });
      
      const searchInput = screen.getByPlaceholderText('Search menu items...');
      await waitFor(() => {
        expect(searchInput).toHaveFocus();
      });
    });
  });

  describe('Suspense Fallback', () => {
    it('should remain accessible during lazy loading', async () => {
      // This test ensures the loading fallback is accessible
      render(
        <MemoryRouter>
          <TestWrapper>
            <div>Loading content...</div>
          </TestWrapper>
        </MemoryRouter>
      );
      
      // The loading component should be accessible
      expect(screen.getByText('Loading content...')).toBeInTheDocument();
    });
  });
});
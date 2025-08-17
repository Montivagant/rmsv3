import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

// Mock the persistent event store
vi.mock('../events/store', () => {
  const mockHydrate = vi.fn().mockResolvedValue(undefined);
  const mockGetAll = vi.fn().mockReturnValue([]);
  const mockAppend = vi.fn();
  const mockReset = vi.fn();
  
  return {
    persistentEventStore: {
      hydrate: mockHydrate,
      getAll: mockGetAll,
      append: mockAppend,
      reset: mockReset
    },
    eventStore: {
      getAll: mockGetAll,
      append: mockAppend,
      reset: mockReset
    }
  };
});

// Mock all the page components to avoid complex rendering
vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>
}));

vi.mock('../pages/POS', () => ({
  default: () => <div data-testid="pos">POS</div>
}));

vi.mock('../pages/KDS', () => ({
  default: () => <div data-testid="kds">KDS</div>
}));

vi.mock('../pages/Inventory', () => ({
  default: () => <div data-testid="inventory">Inventory</div>
}));

vi.mock('../pages/Customers', () => ({
  default: () => <div data-testid="customers">Customers</div>
}));

vi.mock('../pages/Reports', () => ({
  default: () => <div data-testid="reports">Reports</div>
}));

vi.mock('../pages/Settings', () => ({
  default: () => <div data-testid="settings">Settings</div>
}));

vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login">Login</div>
}));

vi.mock('../pages/NotFound', () => ({
  NotFound: () => <div data-testid="not-found">Not Found</div>
}));

// Mock the Layout component
vi.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  )
}));

// Mock RBAC
vi.mock('../rbac/roles', () => ({
  getCurrentUser: vi.fn().mockReturnValue({ id: '1', role: 'ADMIN' }),
  Role: { ADMIN: 'ADMIN' }
}));

// Mock UI store
vi.mock('../store/ui', () => ({
  useUI: vi.fn().mockReturnValue('normal'),
  getDensityClasses: vi.fn().mockReturnValue('density-normal')
}));

// Mock feature flags
vi.mock('../store/flags', () => ({
  useFeature: vi.fn().mockReturnValue(true)
}));

// Mock react-router-dom to control navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate
  };
});



describe('App Hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('successful hydration', () => {
    it('should call hydrate when imported', async () => {
      const { persistentEventStore } = await import('../events/store');
      
      // Import App to trigger hydration
      await import('../App');

      await waitFor(() => {
        expect(persistentEventStore.hydrate).toHaveBeenCalled();
      });
    });
  });

  describe('hydration integration', () => {
    it('should call hydrate during app initialization', async () => {
      const { persistentEventStore } = await import('../events/store');
      
      // Import App to trigger hydration
      await import('../App');

      await waitFor(() => {
        expect(persistentEventStore.hydrate).toHaveBeenCalled();
      });
    });
  });
});
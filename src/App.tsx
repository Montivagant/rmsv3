import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import ErrorBoundary from './components/ErrorBoundary';
import { AdminLayout } from './components/AdminLayout';
import { getCurrentUser, Role, setCurrentUser } from './rbac/roles';
import { DynamicRoleGuard } from './rbac/dynamicGuard';
import { PersistenceDebugger } from './components/PersistenceDebugger';
import { useUI, getDensityClasses } from './store/ui';

// Lazy load all pages
const DashboardEnhanced = lazy(() => import('./pages/DashboardEnhanced'));
const POS = lazy(() => import('./pages/POS'));
const KDS = lazy(() => import('./pages/KDS'));
const Clockin = lazy(() => import('./pages/ClockIn'));
const Customers = lazy(() => import('./pages/Customers'));
const Recipes = lazy(() => import('./components/RecipeManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

const SignupSuccess = lazy(() => import('./pages/SignupSuccess'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Orders pages
const ActiveOrders = lazy(() => import('./pages/orders/ActiveOrders'));
const OrderHistory = lazy(() => import('./pages/orders/OrderHistory'));

// Inventory pages
const Transfers = lazy(() => import('./pages/inventory/Transfers'));
const TransferDetail = lazy(() => import('./pages/inventory/TransferDetail'));
const EditTransfer = lazy(() => import('./pages/inventory/EditTransfer'));
// CountSheets removed as part of feature simplification
// NewCount doesn't exist - use audit component with query parameter
const InventoryAudit = lazy(() => import('./pages/inventory/InventoryAudit'));
const AuditSession = lazy(() => import('./pages/inventory/AuditSession'));
const InventoryHistory = lazy(() => import('./pages/inventory/History'));
const InventoryCategoryManagement = lazy(() => import('./pages/inventory/CategoryManagement'));
const InventoryItemTypes = lazy(() => import('./pages/inventory/ItemTypes'));
// Cost Adjustments and Purchase Orders imports removed

// Reports pages
const SalesReports = lazy(() => import('./pages/reports/SalesReports'));
const InventoryReports = lazy(() => import('./pages/reports/InventoryReports'));

// Admin Reports pages
// Report landings removed; link directly to actual reports
const ShiftsReport = lazy(() => import('./pages/reports/ShiftsReport'));
const VoidsReturnsReport = lazy(() => import('./pages/reports/VoidsReturnsReport'));
const PaymentsReports = lazy(() => import('./pages/reports/PaymentsReports'));
const ActivityLog = lazy(() => import('./pages/reports/ActivityLog'));
const TransfersReport = lazy(() => import('./pages/reports/TransfersReport'));
const KDSReport = lazy(() => import('./pages/reports/KDSReport'));
// Removed unused Analysis/Customer/Z reports to simplify

// Settings pages
const MenuManagement = lazy(() => import('./pages/settings/MenuManagement'));
const TaxSettings = lazy(() => import('./pages/settings/TaxSettings'));
const SystemSettings = lazy(() => import('./pages/settings/SystemSettings'));

// Menu pages
const MenuCategories = lazy(() => import('./pages/menu/Categories'));
const MenuItems = lazy(() => import('./pages/menu/Items'));
const MenuModifiers = lazy(() => import('./pages/menu/Modifiers'));
// Combos and Allergens imports removed

// Additional Inventory pages
const InventoryItems = lazy(() => import('./pages/inventory/Items'));

// Manage pages
const ManageUsers = lazy(() => import('./pages/manage/Users'));
const ManageRoles = lazy(() => import('./pages/manage/Roles'));
const ManageBranches = lazy(() => import('./pages/manage/Branches'));
const ManageShifts = lazy(() => import('./pages/manage/Shifts'));
// More page import removed
const ItemTypes = lazy(() => import('./pages/manage/ItemTypes'));

// Marketing pages removed - not essential for core restaurant operations

// Account pages
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const BusinessPage = lazy(() => import('./pages/account/BusinessPage'));
const PreferencesPage = lazy(() => import('./pages/account/PreferencesPage'));
const NotificationsPage = lazy(() => import('./pages/account/NotificationsPage'));
const SecurityPage = lazy(() => import('./pages/account/SecurityPage'));

// Loading component
function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
        <p className="text-secondary mt-4">{message}</p>
      </div>
    </div>
  );
}

// Simple wrapper component - hydration now handled by EventStoreProvider
function HydrationWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    // In development, auto-login as Business Owner to prevent accidental redirects
    if (import.meta.env.DEV) {
      setCurrentUser({ id: 'dev-user', name: 'Development User', role: Role.BUSINESS_OWNER });
      return <>{children}</>; // allow render on same pass
    }
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Determine if user should get admin interface
function shouldUseAdminLayout(): boolean {
  // Always use admin layout since we only have Business Owner role
  return true;
}

export function AppContent() {
  const density = useUI((state) => state.density);
  const useAdminLayout = shouldUseAdminLayout();
  
  const AppRouter = ({ children }: { children: ReactNode }) => {
    const isTest = Boolean((import.meta as any).env?.VITEST);
    if (isTest) {
      const testEntries = (globalThis as any).__TEST_INITIAL_ENTRIES as string[] | undefined;
      const initialEntries = testEntries && testEntries.length ? testEntries : [window.location.pathname || '/'];
      return (
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      );
    }
    return (
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </Router>
    );
  };

  return (
    <div className={getDensityClasses(density)}>
      <AppRouter>
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
            {/* Unprotected routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/success" element={<SignupSuccess />} />
            
            {/* Protected routes with layout wrapper */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  {useAdminLayout ? <AdminLayout /> : <Layout />}
                </ProtectedRoute>
              }
            >
            {/* Root redirect to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardEnhanced />} />
            <Route path="pos" element={<POS />} />
            <Route path="kds" element={<KDS />} />
            <Route path="clockin" element={<Clockin />} />
            
            {/* Orders Routes */}
            <Route path="orders" element={<ActiveOrders />} />
            <Route path="orders/active" element={<ActiveOrders />} />
            <Route path="orders/history" element={<OrderHistory />} />
            
            {/* Inventory Routes */}
            <Route path="inventory" element={<Navigate to="/inventory/items" replace />} />
            <Route path="inventory/counts" element={<Navigate to="/inventory/audit" replace />} />
            <Route path="inventory/items" element={
              <DynamicRoleGuard requiredPermission="inventory.view">
                <InventoryItems />
              </DynamicRoleGuard>
            } />
            {/* Suppliers route removed */}
            <Route path="inventory/audit" element={
              <DynamicRoleGuard requiredPermission="inventory.count">
                <InventoryAudit />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/audit/:auditId" element={
              <DynamicRoleGuard requiredPermission="inventory.count">
                <AuditSession />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/audit/:auditId/entry" element={
              <DynamicRoleGuard requiredPermission="inventory.count">
                <AuditSession />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/transfers" element={
              <DynamicRoleGuard requiredPermission="inventory.view">
                <Transfers />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/transfers/:transferId" element={
              <DynamicRoleGuard requiredPermission="inventory.view">
                <TransferDetail />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/transfers/:transferId/edit" element={
              <DynamicRoleGuard requiredPermission="inventory.edit">
                <EditTransfer />
              </DynamicRoleGuard>
            } />
            {/* Purchase Orders and Cost Adjustments removed - not essential for core operations */}
            <Route path="inventory/audit/new" element={
              <DynamicRoleGuard requiredPermission="inventory.count">
                <InventoryAudit newAudit={true} />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/history" element={
              <DynamicRoleGuard requiredPermission="inventory.view">
                <InventoryHistory />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/categories" element={
              <DynamicRoleGuard requiredPermission="inventory.view">
                <InventoryCategoryManagement />
              </DynamicRoleGuard>
            } />
            <Route path="inventory/item-types" element={
              <DynamicRoleGuard requiredPermission="inventory.view">
                <InventoryItemTypes />
              </DynamicRoleGuard>
            } />
            <Route path="customers" element={<Customers />} />
            {/* Menu Management */}
            <Route path="menu/categories" element={
              <DynamicRoleGuard requiredPermission="menu.view">
                <MenuCategories />
              </DynamicRoleGuard>
            } />
            <Route path="menu/items" element={
              <DynamicRoleGuard requiredPermission="menu.view">
                <MenuItems />
              </DynamicRoleGuard>
            } />

            {/* Recipes Management */}
            <Route path="recipes" element={
              <DynamicRoleGuard requiredPermission="recipes.view">
                <Recipes />
              </DynamicRoleGuard>
            } />
            
            {/* Reports Routes */}
            <Route path="reports/sales" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <SalesReports />
              </DynamicRoleGuard>
            } />
            <Route path="reports/inventory" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <InventoryReports />
              </DynamicRoleGuard>
            } />
            <Route path="reports/transfers" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <TransfersReport />
              </DynamicRoleGuard>
            } />
            <Route path="reports/shifts" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <ShiftsReport />
              </DynamicRoleGuard>
            } />
            <Route path="reports/payments" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <PaymentsReports />
              </DynamicRoleGuard>
            } />
            <Route path="reports/voids-returns" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <VoidsReturnsReport />
              </DynamicRoleGuard>
            } />
            <Route path="reports/activity-log" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <ActivityLog />
              </DynamicRoleGuard>
            } />
            <Route path="reports/kds" element={
              <DynamicRoleGuard requiredPermission="reports.view">
                <KDSReport />
              </DynamicRoleGuard>
            } />
            
            {/* Legacy menu routes - handled above in main menu section */}
            <Route path="menu/modifiers" element={
              <DynamicRoleGuard requiredPermission="settings.view">
                <MenuModifiers />
              </DynamicRoleGuard>
            } />
            {/* Combos and Allergens removed - advanced features not needed */}
            
            {/* Management Routes (Admin only) */}
            <Route path="manage/users" element={
              <DynamicRoleGuard requiredPermission="settings.user_management">
                <ManageUsers />
              </DynamicRoleGuard>
            } />
            <Route path="manage/roles" element={
              <DynamicRoleGuard requiredPermission="settings.role_management">
                <ManageRoles />
              </DynamicRoleGuard>
            } />
            <Route path="manage/branches" element={
              <DynamicRoleGuard requiredPermission="settings.edit">
                <ManageBranches />
              </DynamicRoleGuard>
            } />
            <Route path="manage/shifts" element={
              <DynamicRoleGuard requiredPermission="settings.edit">
                <ManageShifts />
              </DynamicRoleGuard>
            } />
            {/* More page route removed - not essential */}
            <Route path="manage/item-types" element={
              <DynamicRoleGuard requiredPermission="settings.edit">
                <ItemTypes />
              </DynamicRoleGuard>
            } />
            
            {/* Marketing routes removed - not essential for core restaurant operations */}
            
            {/* Account Routes (Admin only) */}
            <Route path="account" element={
              <DynamicRoleGuard requiredPermission="settings.view">
                <AccountLayout />
              </DynamicRoleGuard>
            }>
              <Route index element={<Navigate to="/account/profile" replace />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="business" element={<BusinessPage />} />
              <Route path="preferences" element={<PreferencesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="security" element={<SecurityPage />} />
            </Route>
            
            {/* Settings Routes */}
            <Route path="settings" element={
              <DynamicRoleGuard requiredPermission="settings.view">
                <Settings />
              </DynamicRoleGuard>
            } />
            <Route path="settings/menu" element={
              <DynamicRoleGuard requiredPermission="settings.view">
                <MenuManagement />
              </DynamicRoleGuard>
            } />
            <Route path="settings/tax" element={
              <DynamicRoleGuard requiredPermission="settings.edit">
                <TaxSettings />
              </DynamicRoleGuard>
            } />
            <Route path="settings/system" element={
              <DynamicRoleGuard requiredPermission="settings.system_config">
                <SystemSettings />
              </DynamicRoleGuard>
            } />
            {/* Catch-all within protected layout */}
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppRouter>
      <PersistenceDebugger />
    </div>
  );
}

function App() {
  return (
    <HydrationWrapper>
      <AppContent />
    </HydrationWrapper>
  );
}

export default App



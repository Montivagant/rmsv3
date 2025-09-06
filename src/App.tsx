import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { AdminLayout } from './components/AdminLayout';
import { getCurrentUser, Role } from './rbac/roles';
import { RoleGuard } from './rbac/guard';
import { PersistenceDebugger } from './components/PersistenceDebugger';
import { useUI, getDensityClasses } from './store/ui';
import { useFeature } from './store/flags';

// Lazy load all pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardEnhanced = lazy(() => import('./pages/DashboardEnhanced'));
const POS = lazy(() => import('./pages/POS'));
const KDS = lazy(() => import('./pages/KDS'));
const Inventory = lazy(() => import('./pages/Inventory-complete'));
const Customers = lazy(() => import('./pages/Customers'));
const Recipes = lazy(() => import('./components/RecipeManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const SignupSuccess = lazy(() => import('./pages/SignupSuccess'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Orders pages
const ActiveOrders = lazy(() => import('./pages/orders/ActiveOrders'));
const OrderHistory = lazy(() => import('./pages/orders/OrderHistory'));

// Inventory pages
const Suppliers = lazy(() => import('./pages/inventory/Suppliers'));
const CountSession = lazy(() => import('./pages/inventory/CountSession'));
const Transfers = lazy(() => import('./pages/inventory/Transfers'));
const TransferDetail = lazy(() => import('./pages/inventory/TransferDetail'));
const EditTransfer = lazy(() => import('./pages/inventory/EditTransfer'));
const CountSheets = lazy(() => import('./pages/inventory/CountSheets'));
const NewCountFromSheet = lazy(() => import('./pages/inventory/NewCountFromSheet'));

// Reports pages
const SalesReports = lazy(() => import('./pages/reports/SalesReports'));
const InventoryReports = lazy(() => import('./pages/reports/InventoryReports'));
const CustomerReports = lazy(() => import('./pages/reports/CustomerReports'));
const ZReports = lazy(() => import('./pages/reports/ZReports'));

// Admin Reports pages
const SalesReportsLanding = lazy(() => import('./pages/reports/SalesReportsLanding'));
const InventoryReportsLanding = lazy(() => import('./pages/reports/InventoryReportsLanding'));
const BusinessReports = lazy(() => import('./pages/reports/BusinessReports'));
const AnalysisReports = lazy(() => import('./pages/reports/AnalysisReports'));

// Settings pages
const MenuManagement = lazy(() => import('./pages/settings/MenuManagement'));
const TaxSettings = lazy(() => import('./pages/settings/TaxSettings'));
const SystemSettings = lazy(() => import('./pages/settings/SystemSettings'));

// Menu pages
const MenuCategories = lazy(() => import('./pages/menu/Categories'));
const MenuProducts = lazy(() => import('./pages/menu/Products'));
const MenuModifiers = lazy(() => import('./pages/menu/Modifiers'));
const MenuCombos = lazy(() => import('./pages/menu/Combos'));
const MenuAllergens = lazy(() => import('./pages/menu/settings/Allergens'));

// Inventory pages
const InventoryItems = lazy(() => import('./pages/inventory/Items'));
const InventoryCounts = lazy(() => import('./pages/inventory/Counts'));
const InventoryTransfers = lazy(() => import('./pages/inventory/Transfers'));
const InventoryHistory = lazy(() => import('./pages/inventory/History'));

// Manage pages
const ManageUsers = lazy(() => import('./pages/manage/Users'));
const ManageRoles = lazy(() => import('./pages/manage/Roles'));
const ManageBranches = lazy(() => import('./pages/manage/Branches'));
const ManageMore = lazy(() => import('./pages/manage/More'));

// Marketing pages
const MarketingLoyalty = lazy(() => import('./pages/marketing/Loyalty'));

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
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Determine if user should get admin interface
function shouldUseAdminLayout(currentUser: any): boolean {
  // Always use admin layout since we only have Business Owner role
  return true;
}

// Feature disabled banner component
function FeatureDisabledBanner({ feature }: { feature: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Feature Disabled</h1>
        <p className="text-xl text-secondary mb-4">
          The {feature} feature is currently disabled.
        </p>
        <p className="text-tertiary">
          Contact your administrator to enable this feature.
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const density = useUI((state) => state.density);
  const kdsEnabled = useFeature('kds');
  const currentUser = getCurrentUser();
  const useAdminLayout = shouldUseAdminLayout(currentUser);
  
  return (
    <div className={getDensityClasses(density)}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            <Route path="kds" element={
              kdsEnabled ? <KDS /> : <FeatureDisabledBanner feature="Kitchen Display System" />
            } />
            
            {/* Orders Routes */}
            <Route path="orders" element={<ActiveOrders />} />
            <Route path="orders/active" element={<ActiveOrders />} />
            <Route path="orders/history" element={<OrderHistory />} />
            
            {/* Inventory Routes */}
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/items" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <InventoryItems />
              </RoleGuard>
            } />
            <Route path="inventory/suppliers" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <Suppliers />
              </RoleGuard>
            } />
            <Route path="inventory/counts" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <InventoryCounts />
              </RoleGuard>
            } />
            <Route path="inventory/counts/:countId" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <CountSession />
              </RoleGuard>
            } />
            <Route path="inventory/counts/:countId/entry" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <CountSession />
              </RoleGuard>
            } />
            <Route path="inventory/transfers" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <Transfers />
              </RoleGuard>
            } />
            <Route path="inventory/transfers/:transferId" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <TransferDetail />
              </RoleGuard>
            } />
            <Route path="inventory/transfers/:transferId/edit" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <EditTransfer />
              </RoleGuard>
            } />
            <Route path="inventory/count-sheets" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <CountSheets />
              </RoleGuard>
            } />
            <Route path="inventory/counts/new" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <NewCountFromSheet />
              </RoleGuard>
            } />
            <Route path="inventory/history" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <InventoryHistory />
              </RoleGuard>
            } />
            
            <Route path="customers" element={<Customers />} />
            <Route path="recipes" element={<Recipes />} />
            
            {/* Reports Routes */}
            <Route path="reports" element={<Reports />} />
            <Route path="reports/sales" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                {useAdminLayout ? <SalesReportsLanding /> : <SalesReports />}
              </RoleGuard>
            } />
            <Route path="reports/inventory" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                {useAdminLayout ? <InventoryReportsLanding /> : <InventoryReports />}
              </RoleGuard>
            } />
            <Route path="reports/business" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <BusinessReports />
              </RoleGuard>
            } />
            <Route path="reports/analysis" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <AnalysisReports />
              </RoleGuard>
            } />
            <Route path="reports/customers" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <CustomerReports />
              </RoleGuard>
            } />
            <Route path="reports/z-reports" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <ZReports />
              </RoleGuard>
            } />
            
            {/* Menu Routes (Admin only) */}
            <Route path="menu/categories" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MenuCategories />
              </RoleGuard>
            } />
            <Route path="menu/products" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MenuProducts />
              </RoleGuard>
            } />
            <Route path="menu/modifiers" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MenuModifiers />
              </RoleGuard>
            } />
            <Route path="menu/combos" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MenuCombos />
              </RoleGuard>
            } />
            <Route path="menu/settings/allergens" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MenuAllergens />
              </RoleGuard>
            } />
            
            {/* Management Routes (Admin only) */}
            <Route path="manage/users" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <ManageUsers />
              </RoleGuard>
            } />
            <Route path="manage/roles" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <ManageRoles />
              </RoleGuard>
            } />
            <Route path="manage/branches" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <ManageBranches />
              </RoleGuard>
            } />
            <Route path="manage/more" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <ManageMore />
              </RoleGuard>
            } />
            
            {/* Marketing Routes (Admin only) */}
            <Route path="marketing/loyalty" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MarketingLoyalty />
              </RoleGuard>
            } />

            {/* Account Routes (Admin only) */}
            <Route path="account" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <AccountLayout />
              </RoleGuard>
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
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <Settings />
              </RoleGuard>
            } />
            <Route path="settings/menu" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <MenuManagement />
              </RoleGuard>
            } />
            <Route path="settings/tax" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <TaxSettings />
              </RoleGuard>
            } />
            <Route path="settings/system" element={
              <RoleGuard requiredRole={Role.BUSINESS_OWNER}>
                <SystemSettings />
              </RoleGuard>
            } />
          </Route>
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
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
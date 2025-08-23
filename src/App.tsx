import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Layout } from './components';
import { getCurrentUser, Role } from './rbac/roles';
import { RoleGuard } from './rbac/guard';
import { PersistenceDebugger } from './components/PersistenceDebugger';
import { useUI, getDensityClasses } from './store/ui';
import { useFeature } from './store/flags';

// Lazy load all pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const KDS = lazy(() => import('./pages/KDS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Loading component
function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">{message}</p>
      </div>
    </div>
  );
}

// Simple wrapper component - hydration now handled by EventStoreProvider
function HydrationWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Feature disabled banner component
function FeatureDisabledBanner({ feature }: { feature: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Feature Disabled</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
          The {feature} feature is currently disabled.
        </p>
        <p className="text-gray-500 dark:text-gray-500">
          Contact your administrator to enable this feature.
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const density = useUI((state) => state.density);
  const kdsEnabled = useFeature('kds');
  
  return (
    <div className={getDensityClasses(density)}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading />}>
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

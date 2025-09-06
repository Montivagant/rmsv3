import React, { Suspense, lazy } from 'react';
import { useDashboardQuery } from '../lib/dashboard/useDashboardQuery';
import { DashboardFilters } from '../components/ui/DashboardFilters';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/Loading';

// Lazy load tab components for better performance
const GeneralTab = lazy(() => import('../components/dashboard/GeneralTab'));
const BranchesTab = lazy(() => import('../components/dashboard/BranchesTab'));
const InventoryTab = lazy(() => import('../components/dashboard/InventoryTab'));

interface DashboardTab {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
}

/**
 * Enhanced Dashboard with tabbed interface for Owner/Admin view
 * Features URL query persistence and responsive design
 */
export default function DashboardEnhanced() {
  const {
    query,
    periodLabel,
    branchesLabel,
    setTab,
    setPeriod,
    setDateRange,
    setBranches,
    toggleCompare
  } = useDashboardQuery();

  // Define dashboard tabs
  const tabs: DashboardTab[] = [
    {
      id: 'general',
      label: 'General',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      component: GeneralTab
    },
    {
      id: 'branches',
      label: 'Branches',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      component: BranchesTab
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      component: InventoryTab
    }
  ];

  const activeTab = tabs.find(tab => tab.id === query.tab) || tabs[0];
  const ActiveComponent = activeTab.component;

  return (
    <div className="p-6 space-y-6">
      {/* Header with title and filters */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Monitor your business performance and operations
          </p>
        </div>
        
        {/* Dashboard Filters */}
        <DashboardFilters
          period={query.period}
          onPeriodChange={setPeriod}
          startDate={query.startDate}
          endDate={query.endDate}
          onDateRangeChange={setDateRange}
          branches={query.branches}
          onBranchesChange={setBranches}
          compare={query.compare}
          onCompareToggle={toggleCompare}
          periodLabel={periodLabel}
          branchesLabel={branchesLabel}
          className="flex-shrink-0"
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-primary">
        <nav 
          className="-mb-px flex space-x-8 overflow-x-auto scrollbar-thin" 
          aria-label="Dashboard tabs"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === query.tab;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                onClick={() => setTab(tab.id as any)}
                className={cn(
                  'group inline-flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-sm',
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                )}
              >
                <svg 
                  className="w-5 h-5 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={tab.icon} 
                  />
                </svg>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`${activeTab.id}-panel`}
        aria-labelledby={`${activeTab.id}-tab`}
      >
        <Suspense fallback={<DashboardTabSkeleton />}>
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for dashboard tab content
 */
function DashboardTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-surface border border-border-primary rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-40 mb-2" />
            <Skeleton className="h-3 w-20 mb-2" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <div>
          <div className="bg-surface border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>

      {/* Lists Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

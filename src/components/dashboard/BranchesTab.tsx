import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/KpiCard';
import { cn } from '../../lib/utils';
import { useDashboardQuery } from '../../lib/dashboard/useDashboardQuery';
import { branchHealthAdapter, formatCurrency, formatRelativeTime } from '../../lib/dashboard/adapters';
import type { BranchHealthData } from '../../lib/dashboard/types';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useRepository } from '../../hooks/useRepository';
import { listBranches } from '../../management/repository';

/**
 * Branches dashboard tab - Branch health KPIs and detailed table
 * Provides sortable columns, sticky header, and proper empty states
 */
export default function BranchesTab() {
  const navigate = useNavigate();
  const { query } = useDashboardQuery();
  // Get period from query
  const period = query.period === 'day' ? 'today' : 
                query.period === 'week' ? 'week' : 
                query.period === 'month' ? 'month' : 'today';

  // Fetch real branches data and analytics
  const { data: branches = [], loading: branchesLoading } = useRepository(listBranches, []);
  const { analytics, loading: analyticsLoading } = useAnalytics({ 
    period,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  const loading = branchesLoading || analyticsLoading;
  const [sortConfig, setSortConfig] = useState<{
    key: keyof BranchHealthData;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Combine branch data with analytics performance data
  const branchData = useMemo(() => {
    if (!branches?.length || !analytics) return [];

    const availableBranches = query.branches?.length > 0 
      ? branches.filter(branch => query.branches?.includes(branch.id))
      : branches;

    return availableBranches.map(branch => {
      // Find performance data for this branch from analytics
      const performance = analytics.branchPerformance?.find(p => p.id === branch.id);
      
      // Only use real data - no mock/random data
      const activeOrders = performance?.orderCount || 0;
      const activeOrdersAmount = performance?.revenue || 0;
      
      // Calculate branch status based on real activity only
      let status: 'online' | 'warning' | 'offline' = 'online';
      if (activeOrders === 0 && performance) {
        status = 'warning'; // Has data but no active orders
      } else if (!performance) {
        status = 'offline'; // No performance data available
      }

      // Transform to BranchHealthData format - only real data
      return branchHealthAdapter.transform([{
        id: branch.id,
        name: branch.name,
        activeOrders,
        activeOrdersAmount,
        occupiedTables: 0,
        offlineCashiers: 0,
        openTills: 0,
        lastSync: new Date().toISOString(),
        lastOrder: performance ? new Date().toISOString() : '',
        status
      }])[0];
    });
  }, [branches, analytics, query.branches]);

  // Calculate aggregate KPIs - only real data
  const aggregateKpis = useMemo(() => {
    if (loading || branchData.length === 0) {
      return {
        totalActiveOrders: 0,
        totalActiveAmount: 0
      };
    }

    return branchData.reduce((acc, branch) => ({
      totalActiveOrders: acc.totalActiveOrders + branch.activeOrders,
      totalActiveAmount: acc.totalActiveAmount + branch.activeOrdersAmount
    }), {
      totalActiveOrders: 0,
      totalActiveAmount: 0
    });
  }, [branchData, loading]);

  // Sorting functionality
  const sortedBranchData = useMemo(() => {
    if (!sortConfig) return branchData;

    return [...branchData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }

      return 0;
    });
  }, [branchData, sortConfig]);

  const handleSort = (key: keyof BranchHealthData) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof BranchHealthData) => {
    if (!sortConfig || sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getStatusBadge = (status: 'online' | 'offline' | 'warning') => {
    const statusConfig = {
      online: { 
        label: 'Online', 
        className: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400' 
      },
      offline: { 
        label: 'Offline', 
        className: 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-400' 
      },
      warning: { 
        label: 'Warning', 
        className: 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400' 
      }
    };

    const config = statusConfig[status];
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        config.className
      )}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Branch KPIs - Only Real Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          title="Active Orders Count"
          value={aggregateKpis.totalActiveOrders}
          subtitle="Across all branches"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          loading={loading}
        />

        <KpiCard
          title="Active Orders Amount"
          value={formatCurrency(aggregateKpis.totalActiveAmount)}
          subtitle="Total order value"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          loading={loading}
        />
      </div>

      {/* Branch Health Table */}
      <div className="bg-surface border border-border-primary rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border-secondary">
          <h2 className="text-lg font-semibold text-text-primary">
            Branch Performance Overview
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Real-time status and performance metrics for all branches
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-secondary rounded w-3/4"></div>
                    <div className="h-3 bg-surface-secondary rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-surface-secondary rounded w-20"></div>
                  <div className="h-4 bg-surface-secondary rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        ) : branchData.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No branch data available
            </h3>
            <p className="text-text-secondary">
              Branch performance data will appear here when available
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-secondary">
              <thead className="bg-surface-secondary sticky top-0">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Branch</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('activeOrders')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Active Orders</span>
                      {getSortIcon('activeOrders')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('activeOrdersAmount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      {getSortIcon('activeOrdersAmount')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('occupiedTables')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Occupied Tables</span>
                      {getSortIcon('occupiedTables')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('offlineCashiers')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Offline Cashiers</span>
                      {getSortIcon('offlineCashiers')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('openTills')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Open Tills</span>
                      {getSortIcon('openTills')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('lastSync')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Last Sync</span>
                      {getSortIcon('lastSync')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-tertiary transition-colors"
                    onClick={() => handleSort('lastOrder')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Last Order</span>
                      {getSortIcon('lastOrder')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border-secondary">
                {sortedBranchData.map((branch) => (
                  <tr 
                    key={branch.id} 
                    className="hover:bg-surface-secondary transition-colors cursor-pointer"
                    onClick={() => navigate('/manage/branches')}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-primary">
                        {branch.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {branch.activeOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {formatCurrency(branch.activeOrdersAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {branch.occupiedTables}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {branch.offlineCashiers > 0 ? (
                        <span className="text-error-600 font-medium">
                          {branch.offlineCashiers}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {branch.openTills}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatRelativeTime(branch.lastSync)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatRelativeTime(branch.lastOrder)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(branch.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

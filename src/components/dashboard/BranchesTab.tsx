import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/KpiCard';
import { cn } from '../../lib/utils';
import { useDashboardQuery } from '../../lib/dashboard/useDashboardQuery';
import { branchHealthAdapter, formatCurrency, formatRelativeTime } from '../../lib/dashboard/adapters';
import type { BranchHealthData } from '../../lib/dashboard/types';

/**
 * Branches dashboard tab - Branch health KPIs and detailed table
 * Provides sortable columns, sticky header, and proper empty states
 */
export default function BranchesTab() {
  const navigate = useNavigate();
  const { query } = useDashboardQuery();
  const [loading, setLoading] = useState(true);
  const [branchData, setBranchData] = useState<BranchHealthData[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof BranchHealthData;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Simulate data loading
  useEffect(() => {
    const loadBranchData = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Mock branch data - TODO: Replace with actual API call
      const mockApiResponse = [
        {
          id: 'main',
          name: 'Main Branch',
          activeOrders: 12,
          activeOrdersAmount: 2847,
          occupiedTables: 8,
          offlineCashiers: 0,
          openTills: 3,
          lastSync: new Date(Date.now() - 300000).toISOString(), // 5 min ago
          lastOrder: new Date(Date.now() - 120000).toISOString(), // 2 min ago
          status: 'online' as const
        },
        {
          id: 'downtown',
          name: 'Downtown Branch',
          activeOrders: 8,
          activeOrdersAmount: 1956,
          occupiedTables: 6,
          offlineCashiers: 1,
          openTills: 2,
          lastSync: new Date(Date.now() - 600000).toISOString(), // 10 min ago
          lastOrder: new Date(Date.now() - 480000).toISOString(), // 8 min ago
          status: 'warning' as const
        },
        {
          id: 'mall',
          name: 'Shopping Mall',
          activeOrders: 15,
          activeOrdersAmount: 3542,
          occupiedTables: 12,
          offlineCashiers: 0,
          openTills: 4,
          lastSync: new Date(Date.now() - 180000).toISOString(), // 3 min ago
          lastOrder: new Date(Date.now() - 60000).toISOString(), // 1 min ago
          status: 'online' as const
        },
        {
          id: 'airport',
          name: 'Airport Terminal',
          activeOrders: 0,
          activeOrdersAmount: 0,
          occupiedTables: 0,
          offlineCashiers: 2,
          openTills: 0,
          lastSync: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          lastOrder: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          status: 'offline' as const
        }
      ];

      // Filter by selected branches if any
      const filteredData = query.branches.length > 0 
        ? mockApiResponse.filter(branch => query.branches.includes(branch.id))
        : mockApiResponse;

      const transformedData = branchHealthAdapter.transform(filteredData);
      setBranchData(transformedData);
      setLoading(false);
    };

    loadBranchData();
  }, [query.branches]);

  // Calculate aggregate KPIs
  const aggregateKpis = useMemo(() => {
    if (loading || branchData.length === 0) {
      return {
        totalActiveOrders: 0,
        totalActiveAmount: 0,
        totalOccupiedTables: 0,
        totalOfflineCashiers: 0
      };
    }

    return branchData.reduce((acc, branch) => ({
      totalActiveOrders: acc.totalActiveOrders + branch.activeOrders,
      totalActiveAmount: acc.totalActiveAmount + branch.activeOrdersAmount,
      totalOccupiedTables: acc.totalOccupiedTables + branch.occupiedTables,
      totalOfflineCashiers: acc.totalOfflineCashiers + branch.offlineCashiers
    }), {
      totalActiveOrders: 0,
      totalActiveAmount: 0,
      totalOccupiedTables: 0,
      totalOfflineCashiers: 0
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
      {/* Branch KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <KpiCard
          title="Occupied Tables"
          value={aggregateKpis.totalOccupiedTables}
          subtitle="Currently serving"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          loading={loading}
        />

        <KpiCard
          title="Offline Cashiers"
          value={aggregateKpis.totalOfflineCashiers}
          subtitle="Need attention"
          trend={aggregateKpis.totalOfflineCashiers > 0 ? {
            value: aggregateKpis.totalOfflineCashiers,
            isPositive: false
          } : undefined}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
                    onClick={() => navigate(`/branches/${branch.id}`)}
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

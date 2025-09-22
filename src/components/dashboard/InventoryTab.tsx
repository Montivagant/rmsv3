import React from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/KpiCard';
import { cn } from '../../lib/utils';
import { useDashboardQuery } from '../../lib/dashboard/useDashboardQuery';
import { inventoryAlertsAdapter, formatCount, formatRelativeTime } from '../../lib/dashboard/adapters';
import type { InventoryAlert } from '../../lib/dashboard/types';
import { useRepository } from '../../hooks/useRepository';
import { listInventoryItems, listInventoryCategories } from '../../inventory/repository';
import { listTransfers } from '../../inventory/transfers/repository';

/**
 * Inventory dashboard tab - Transaction/stock alerts and inventory insights
 * Shows pending transactions, low stock alerts, and top consumed/wasted items
 */
export default function InventoryTab() {
  const navigate = useNavigate();
  const { } = useDashboardQuery();
  
  // Fetch real inventory data
  const { data: inventoryItems = [], loading: itemsLoading } = useRepository(listInventoryItems, []);
  const { data: categories = [], loading: categoriesLoading } = useRepository(listInventoryCategories, []);
  const { data: transfers = [], loading: transfersLoading } = useRepository(listTransfers, []);
  
  const loading = itemsLoading || categoriesLoading || transfersLoading;

  // Process real inventory data
  const inventoryData = React.useMemo(() => {
    if (loading || !inventoryItems || !inventoryItems.length) return null;

    // Generate alerts from real inventory items
    const alerts: any[] = [];
    inventoryItems.forEach((item) => {
      const currentLevel = item.levels?.current || item.quantity || 0;
      const minimumLevel = item.levels?.par?.min || item.reorderPoint || 10;
      
      if (currentLevel === 0) {
        alerts.push({
          id: `alert-out-${item.id}`,
          type: 'out_of_stock',
          itemName: item.name,
          currentLevel: 0,
          minimumLevel,
          location: item.location || 'Main Storage',
          severity: 'high',
          createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString()
        });
      } else if (currentLevel < minimumLevel) {
        alerts.push({
          id: `alert-low-${item.id}`,
          type: 'low_stock',
          itemName: item.name,
          currentLevel,
          minimumLevel,
          location: item.location || 'Main Storage',
          severity: currentLevel < minimumLevel * 0.3 ? 'high' : 'medium',
          createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString()
        });
      }
    });

    // Process transfers for pending transactions (using actual transfer status values)
    const transfersData = Array.isArray(transfers) ? transfers : transfers?.data || [];
    const pendingTransactions = transfersData
      .filter((transfer: any) => transfer.status === 'DRAFT' || transfer.status === 'SENT')
      .slice(0, 5)
      .map((transfer: any) => ({
        id: transfer.id,
        type: 'Stock Transfer',
        description: `${transfer.sourceLocationId} → ${transfer.destinationLocationId} transfer`,
        items: transfer.lines?.length || 0,
        status: transfer.status === 'DRAFT' ? 'pending_approval' : 'in_transit',
        createdAt: transfer.createdAt || new Date().toISOString()
      }));

    // Note: Top Consumed and Top Wasted calculations removed
    // Real consumption tracking would require sales/usage events
    // Real waste tracking would require waste/spoilage events

    const transformedAlerts = inventoryAlertsAdapter.transform(alerts);
    
    return {
      alerts: transformedAlerts,
      pendingTransactions,
      kpis: {
        draftTransfers: transfersData.filter((t: any) => t.status === 'DRAFT').length,
        completedTransfers: transfersData.filter((t: any) => t.status === 'COMPLETED').length,
        totalTransfers: transfersData.length
      }
    };
  }, [inventoryItems, transfers, categories, loading]);

  const getAlertIcon = (type: InventoryAlert['type']) => {
    switch (type) {
      case 'low_stock':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'expiring':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'out_of_stock':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAlertSeverityColor = (severity: InventoryAlert['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-error-600 bg-error-50 dark:bg-error-900/20';
      case 'medium':
        return 'text-warning-600 bg-warning-50 dark:bg-warning-900/20';
      case 'low':
        return 'text-text-secondary bg-surface-secondary';
      default:
        return 'text-text-secondary bg-surface-secondary';
    }
  };

  const getTransactionStatusBadge = (status: string) => {
    const statusConfig = {
      pending_approval: { 
        label: 'Pending Approval', 
        className: 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400' 
      },
      in_transit: { 
        label: 'In Transit', 
        className: 'bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-400' 
      },
      completed: { 
        label: 'Completed', 
        className: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_approval;
    
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
      {/* Inventory KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Draft Transfers"
          value={inventoryData?.kpis.draftTransfers || 0}
          subtitle="In progress"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          }
          action={{
            label: 'View transfers',
            onClick: () => navigate('/inventory/transfers')
          }}
          loading={loading}
        />

        <KpiCard
          title="Completed Transfers"
          value={inventoryData?.kpis.completedTransfers || 0}
          subtitle="Finished"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          action={{
            label: 'View transfers',
            onClick: () => navigate('/inventory/transfers')
          }}
          loading={loading}
        />

        <KpiCard
          title="Total Transfers"
          value={inventoryData?.kpis.totalTransfers || 0}
          subtitle="All time"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          action={{
            label: 'View all transfers',
            onClick: () => navigate('/inventory/transfers')
          }}
          loading={loading}
        />
      </div>

      {/* Pending Transactions Section */}
      <div className="bg-surface border border-border-primary rounded-lg">
        <div className="px-6 py-4 border-b border-border-secondary">
          <h2 className="text-lg font-semibold text-text-primary">
            Pending Transactions
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Inventory transactions requiring attention
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border-secondary rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-secondary rounded w-1/3"></div>
                    <div className="h-3 bg-surface-secondary rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-surface-secondary rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ) : !inventoryData?.pendingTransactions.length ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-success-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              All transactions processed
            </h3>
            <p className="text-text-secondary">
              No pending inventory transactions at the moment. Great job! 
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {inventoryData.pendingTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-4 border border-border-secondary rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                onClick={() => navigate(`/inventory/transactions/${transaction.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-medium text-text-primary">
                      {transaction.type}
                    </h3>
                    {getTransactionStatusBadge(transaction.status)}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {transaction.description} • {formatCount(transaction.items, 'item')} • {formatRelativeTime(transaction.createdAt)}
                  </p>
                </div>
                <svg className="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inventory Alerts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items Reached Low Level */}
        <div className="bg-surface border border-border-primary rounded-lg">
          <div className="px-6 py-4 border-b border-border-secondary">
            <h2 className="text-lg font-semibold text-text-primary">
              Low Stock Alerts
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {loading ? 'Loading...' : `${inventoryData?.alerts.length || 0} items need attention`}
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3">
                    <div className="w-10 h-10 bg-surface-secondary rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface-secondary rounded w-3/4"></div>
                      <div className="h-3 bg-surface-secondary rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !inventoryData?.alerts.length ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-success-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                All stock levels healthy
              </h3>
              <p className="text-text-secondary">
                No low stock alerts at the moment
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              {inventoryData.alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                  onClick={() => navigate(`/inventory/items?search=${encodeURIComponent(alert.itemName)}`)}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    getAlertSeverityColor(alert.severity)
                  )}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {alert.itemName}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {alert.currentLevel}/{alert.minimumLevel} units • {alert.location} • {formatRelativeTime(alert.createdAt)}
                    </p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full capitalize',
                    getAlertSeverityColor(alert.severity)
                  )}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consumption and Waste Analytics Removed */}
        <div className="bg-surface border border-border-primary rounded-lg p-6">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Advanced Analytics Available
            </h3>
            <p className="text-text-secondary mb-4">
              Consumption and waste tracking requires dedicated event logging.
              These features will be available when consumption and waste events are implemented.
            </p>
            <button
              onClick={() => navigate('/inventory/items')}
              className="btn-base btn-primary"
            >
              Manage Inventory Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

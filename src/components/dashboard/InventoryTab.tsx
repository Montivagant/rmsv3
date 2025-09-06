import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/KpiCard';
import { ListCard } from '../cards/ListCard';
import { cn } from '../../lib/utils';
import { useDashboardQuery } from '../../lib/dashboard/useDashboardQuery';
import { inventoryAlertsAdapter, formatCount, formatRelativeTime } from '../../lib/dashboard/adapters';
import type { InventoryAlert } from '../../lib/dashboard/types';

/**
 * Inventory dashboard tab - Transaction/stock alerts and inventory insights
 * Shows pending transactions, low stock alerts, and top consumed/wasted items
 */
export default function InventoryTab() {
  const navigate = useNavigate();
  const { query } = useDashboardQuery();
  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState<{
    alerts: InventoryAlert[];
    pendingTransactions: any[];
    topWasted: any[];
    topConsumed: any[];
    kpis: {
      purchaseOrders: number;
      completedTransfers: number;
      purchasing: number;
    };
  } | null>(null);

  // Simulate data loading
  useEffect(() => {
    const loadInventoryData = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Mock inventory data - TODO: Replace with actual API calls
      const mockAlertsData = [
        {
          id: 'alert-1',
          type: 'low_stock',
          itemName: 'Burger Buns',
          currentLevel: 8,
          minimumLevel: 20,
          location: 'Main Kitchen',
          severity: 'high',
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: 'alert-2',
          type: 'expiring',
          itemName: 'Fresh Lettuce',
          currentLevel: 15,
          minimumLevel: 10,
          location: 'Cold Storage',
          severity: 'medium',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'alert-3',
          type: 'out_of_stock',
          itemName: 'Premium Cheese',
          currentLevel: 0,
          minimumLevel: 5,
          location: 'Main Kitchen',
          severity: 'high',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      const mockPendingTransactions = [
        {
          id: 'tx-1',
          type: 'Purchase Order',
          description: 'Weekly ingredients order',
          items: 25,
          status: 'pending_approval',
          createdAt: new Date(Date.now() - 900000).toISOString()
        },
        {
          id: 'tx-2',
          type: 'Stock Transfer',
          description: 'Main → Downtown transfer',
          items: 8,
          status: 'in_transit',
          createdAt: new Date(Date.now() - 1800000).toISOString()
        }
      ];

      const mockTopWasted = [
        { id: 1, primary: 'French Fries', secondary: '12.5 kg wasted', meta: '8.2% of total' },
        { id: 2, primary: 'Burger Patties', secondary: '8.2 kg wasted', meta: '5.4% of total' },
        { id: 3, primary: 'Lettuce', secondary: '6.8 kg wasted', meta: '4.1% of total' }
      ];

      const mockTopConsumed = [
        { id: 1, primary: 'Burger Buns', secondary: '485 units', meta: '32% of inventory' },
        { id: 2, primary: 'French Fries', secondary: '380 portions', meta: '28% of inventory' },
        { id: 3, primary: 'Coca Cola', secondary: '285 bottles', meta: '24% of inventory' }
      ];

      const transformedAlerts = inventoryAlertsAdapter.transform(mockAlertsData);
      
      setInventoryData({
        alerts: transformedAlerts,
        pendingTransactions: mockPendingTransactions,
        topWasted: mockTopWasted,
        topConsumed: mockTopConsumed,
        kpis: {
          purchaseOrders: Math.floor(Math.random() * 15) + 5,
          completedTransfers: Math.floor(Math.random() * 8) + 3,
          purchasing: Math.floor(Math.random() * 25000) + 15000
        }
      });
      
      setLoading(false);
    };

    loadInventoryData();
  }, [query]);

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
          title="Purchase Orders"
          value={inventoryData?.kpis.purchaseOrders || 0}
          subtitle="Active orders"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1.5 9H6.5L5 9z" />
            </svg>
          }
          action={{
            label: 'View orders',
            onClick: () => navigate('/inventory/orders')
          }}
          loading={loading}
        />

        <KpiCard
          title="Completed Transfers"
          value={inventoryData?.kpis.completedTransfers || 0}
          subtitle="This period"
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
          title="Purchasing"
          value={`${((inventoryData?.kpis.purchasing || 0) / 1000).toFixed(0)}K EGP`}
          subtitle="Total value"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          action={{
            label: 'View report',
            onClick: () => navigate('/reports/inventory')
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

        {/* Top Consumed and Wasted Items */}
        <div className="space-y-6">
          <ListCard
            title="Top Wasted Items"
            items={inventoryData?.topWasted.map(item => ({
              ...item,
              status: 'error' as const,
              action: () => navigate(`/inventory/waste-report`)
            })) || []}
            action={{
              label: 'View waste report',
              onClick: () => navigate('/reports/inventory-waste')
            }}
            loading={loading}
            emptyMessage="No waste data available"
          />

          <ListCard
            title="Top Consumed Items"
            items={inventoryData?.topConsumed.map(item => ({
              ...item,
              status: 'info' as const,
              action: () => navigate('/inventory/items')
            })) || []}
            action={{
              label: 'View consumption report',
              onClick: () => navigate('/reports/inventory-consumption')
            }}
            loading={loading}
            emptyMessage="No consumption data available"
          />
        </div>
      </div>
    </div>
  );
}

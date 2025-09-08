/**
 * Advanced Inventory Management Dashboard
 * 
 * Comprehensive view of inventory status, alerts, and analytics
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../components';
import { useEventStore } from '../../events/context';
import { createAdvancedInventoryService } from '../advancedInventoryService';
import type { 
  InventoryDashboard as DashboardData,
  ReorderAlert,
  ExpirationAlert,
  AdvancedInventoryStatus 
} from '../types';

export function InventoryDashboard() {
  const store = useEventStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryService] = useState(() => createAdvancedInventoryService(store));

  useEffect(() => {
    loadDashboardData();
    
    // Start advanced tracking
    inventoryService.startAdvancedTracking();
    
    return () => {
      inventoryService.stopAdvancedTracking();
    };
  }, [inventoryService]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await inventoryService.getInventoryDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessAutomaticReorders = async () => {
    try {
      const results = await inventoryService.processAutomaticReorders();
      console.log('Processed automatic reorders:', results);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error processing automatic reorders:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading inventory dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Unable to load inventory dashboard</p>
        <Button onClick={loadDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <InventoryStatusOverview status={dashboardData.status} />

      {/* Alert Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReorderAlertsCard 
          alerts={dashboardData.reorderAlerts}
          onProcessAutoReorders={handleProcessAutomaticReorders}
        />
        <ExpirationAlertsCard alerts={dashboardData.expirationAlerts} />
      </div>

      {/* Detailed Tabs */}
      <Card>
        <CardContent className="p-0">
          <div>
            <div role="tablist" className="border-b border-border">
              <button
                role="tab"
                className="px-6 py-4 text-sm font-medium border-b-2 border-brand-600 text-brand-600"
                aria-selected="true"
              >
                Recent Activity
              </button>
              <button
                role="tab"
                className="px-6 py-4 text-sm font-medium text-text-muted hover:text-text-secondary"
                aria-selected="false"
              >
                Supplier Performance
              </button>
              <button
                role="tab"
                className="px-6 py-4 text-sm font-medium text-text-muted hover:text-text-secondary"
                aria-selected="false"
              >
                Analytics
              </button>
            </div>
            
            <div role="tabpanel" className="p-6">
              <RecentTransactionsTable transactions={dashboardData.recentTransactions} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryStatusOverview({ status }: { status: AdvancedInventoryStatus }) {
  const statusCards = [
    {
      title: 'Total Items',
      value: status.totalItems,
      icon: '📦',
      color: 'blue'
    },
    {
      title: 'Total Value',
      value: `$${status.totalValue.toLocaleString()}`,
      icon: '💰',
      color: 'green'
    },
    {
      title: 'Reorder Alerts',
      value: status.activeReorderAlerts,
      icon: '🚨',
      color: status.activeReorderAlerts > 0 ? 'red' : 'gray'
    },
    {
      title: 'Expiring Soon',
      value: status.expirationAlerts,
      icon: '⏰',
      color: status.expirationAlerts > 0 ? 'orange' : 'gray'
    },
    {
      title: 'Low Stock',
      value: status.lowStockItems,
      icon: '⬇️',
      color: status.lowStockItems > 0 ? 'yellow' : 'gray'
    },
    {
      title: 'Turnover Rate',
      value: `${status.turnoverRate}x`,
      icon: '🔄',
      color: 'purple'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statusCards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-text-primary">
              {card.value}
            </div>
            <div className="text-sm text-text-secondary">
              {card.title}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReorderAlertsCard({ 
  alerts, 
  onProcessAutoReorders 
}: { 
  alerts: ReorderAlert[];
  onProcessAutoReorders: () => void;
}) {
  const criticalAlerts = alerts.filter(alert => alert.urgencyLevel === 'critical');
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Reorder Alerts ({alerts.length})
          </CardTitle>
          {criticalAlerts.length > 0 && (
            <Button 
              onClick={onProcessAutoReorders}
              className="bg-error-600 hover:bg-error-700 text-text-inverse"
              size="sm"
            >
              Auto-Reorder Critical Items
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-text-muted text-center py-4">No reorder alerts</p>
          ) : (
            alerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.urgencyLevel === 'critical' ? 'border-error-500 bg-error-50' :
                  alert.urgencyLevel === 'high' ? 'border-warning-500 bg-warning-50' :
                  alert.urgencyLevel === 'medium' ? 'border-warning-500 bg-warning-50' :
                  'border-brand-500 bg-brand-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{alert.itemName}</h4>
                    <p className="text-sm text-text-secondary">
                      SKU: {alert.sku} • Current: {alert.currentQuantity} • 
                      Reorder at: {alert.reorderPoint}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.urgencyLevel === 'critical' ? 'bg-error-100 text-error-700' :
                    alert.urgencyLevel === 'high' ? 'bg-warning-100 text-warning-700' :
                    alert.urgencyLevel === 'medium' ? 'bg-warning-100 text-warning-700' :
                    'bg-brand-100 text-brand-800'
                  }`}>
                    {alert.urgencyLevel.toUpperCase()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExpirationAlertsCard({ alerts }: { alerts: ExpirationAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Expiration Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-text-muted text-center py-4">No expiration alerts</p>
          ) : (
            alerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.daysUntilExpiration <= 1 ? 'border-error-500 bg-error-50' :
                  alert.daysUntilExpiration <= 3 ? 'border-warning-500 bg-warning-50' :
                  'border-warning-500 bg-warning-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{alert.itemName}</h4>
                    <p className="text-sm text-text-secondary">
                      Batch: {alert.batchId} • Quantity: {alert.quantity} • 
                      Expires: {new Date(alert.expirationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.daysUntilExpiration <= 1 ? 'bg-error-100 text-error-700' :
                    alert.daysUntilExpiration <= 3 ? 'bg-warning-100 text-warning-700' :
                    'bg-warning-100 text-warning-700'
                  }`}>
                    {alert.daysUntilExpiration} day{alert.daysUntilExpiration !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTransactionsTable({ 
  transactions 
}: { 
  transactions: DashboardData['recentTransactions'] 
}) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'received': return '📦';
      case 'consumed': return '🍽️';
      case 'transferred': return '🚚';
      case 'wasted': return '🗑️';
      default: return '📝';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'received': return 'text-success-600';
      case 'consumed': return 'text-brand-600';
      case 'transferred': return 'text-brand-600';
      case 'wasted': return 'text-error-600';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-text-primary">
        Recent Transactions
      </h3>
      
      {transactions.length === 0 ? (
        <p className="text-text-muted text-center py-4">No recent transactions</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getTransactionIcon(transaction.type)}</span>
                <div>
                  <p className="font-medium text-text-primary">
                    {transaction.sku}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} • 
                    Qty: {transaction.quantity}
                    {transaction.reference && ` • Ref: ${transaction.reference}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                  {transaction.type.toUpperCase()}
                </p>
                <p className="text-xs text-text-muted">
                  {new Date(transaction.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

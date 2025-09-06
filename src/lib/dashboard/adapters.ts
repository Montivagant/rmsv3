// Dashboard Data Adapters
import type { 
  DashboardKPI, 
  DashboardChartData, 
  BranchHealthData, 
  InventoryAlert,
  MockOrderData,
  MockSalesData,
  DashboardAdapter
} from './types';

/**
 * Formats currency values consistently across the dashboard
 */
export function formatCurrency(amount: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats percentage values with proper sign and precision
 */
export function formatPercentage(value: number, precision = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(precision)}%`;
}

/**
 * Formats count values with proper pluralization
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`;
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Calculates trend percentage between current and previous values
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Generates sparkline data points for trend visualization
 */
export function generateSparkline(data: number[], points = 7): number[] {
  if (data.length <= points) return data;
  
  // Sample data points evenly across the dataset
  const step = data.length / points;
  const result: number[] = [];
  
  for (let i = 0; i < points; i++) {
    const index = Math.floor(i * step);
    result.push(data[Math.min(index, data.length - 1)]);
  }
  
  return result;
}

/**
 * Orders KPI Adapter - Transforms order data to KPI format
 */
export const ordersAdapter: DashboardAdapter<MockOrderData, DashboardKPI> = {
  transform(orderData): DashboardKPI {
    return {
      title: 'Orders',
      value: orderData.count.toLocaleString(),
      subtitle: formatCount(orderData.count, 'completed order'),
      trend: {
        value: Math.abs(orderData.trend),
        isPositive: orderData.trend > 0
      },
      link: '/orders/active'
    };
  },
  
  transformError(error): string {
    return `Failed to load orders data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

/**
 * Sales KPIs Adapter - Transforms sales data to multiple KPI cards
 */
export const salesAdapter: DashboardAdapter<MockSalesData, DashboardKPI[]> = {
  transform(salesData): DashboardKPI[] {
    const baseAmount = salesData.netSales;
    const previousAmount = baseAmount * 0.85; // Mock previous period
    const trend = calculateTrend(baseAmount, previousAmount);
    
    return [
      {
        title: 'Net Sales',
        value: formatCurrency(salesData.netSales),
        subtitle: 'Total revenue after returns',
        trend: {
          value: Math.abs(trend),
          isPositive: trend > 0
        },
        link: '/reports/sales'
      },
      {
        title: 'Net Payments',
        value: formatCurrency(salesData.netPayments),
        subtitle: 'Cash & card payments',
        link: '/reports/payments'
      },
      {
        title: 'Returns Amount',
        value: formatCurrency(salesData.returns),
        subtitle: 'Refunds processed',
        link: '/reports/returns'
      },
      {
        title: 'Discounts Amount',
        value: formatCurrency(salesData.discounts),
        subtitle: 'Total discounts given',
        link: '/reports/discounts'
      }
    ];
  },
  
  transformError(error): string {
    return `Failed to load sales data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

/**
 * Branch Health Adapter - Transforms branch data for the branches tab
 */
export const branchHealthAdapter: DashboardAdapter<any[], BranchHealthData[]> = {
  transform(branchData): BranchHealthData[] {
    // TODO: Replace with actual API response transformation
    return branchData.map((branch, index) => ({
      id: branch.id || `branch-${index}`,
      name: branch.name || `Branch ${index + 1}`,
      activeOrders: branch.activeOrders || Math.floor(Math.random() * 20),
      activeOrdersAmount: branch.activeOrdersAmount || Math.floor(Math.random() * 5000),
      occupiedTables: branch.occupiedTables || Math.floor(Math.random() * 15),
      offlineCashiers: branch.offlineCashiers || Math.floor(Math.random() * 3),
      openTills: branch.openTills || Math.floor(Math.random() * 5) + 1,
      lastSync: branch.lastSync || new Date(Date.now() - Math.random() * 3600000).toISOString(),
      lastOrder: branch.lastOrder || new Date(Date.now() - Math.random() * 1800000).toISOString(),
      status: branch.status || (['online', 'offline', 'warning'][Math.floor(Math.random() * 3)] as 'online' | 'offline' | 'warning')
    }));
  },
  
  transformError(error): string {
    return `Failed to load branch data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

/**
 * Inventory Alerts Adapter - Transforms inventory data to alert format
 */
export const inventoryAlertsAdapter: DashboardAdapter<any[], InventoryAlert[]> = {
  transform(inventoryData): InventoryAlert[] {
    // TODO: Replace with actual inventory API response transformation
    return inventoryData.map((item, index) => ({
      id: item.id || `alert-${index}`,
      type: item.type || (['low_stock', 'expiring', 'out_of_stock'][Math.floor(Math.random() * 3)] as 'low_stock' | 'expiring' | 'out_of_stock'),
      itemName: item.name || `Item ${index + 1}`,
      currentLevel: item.currentLevel || Math.floor(Math.random() * 50),
      minimumLevel: item.minimumLevel || Math.floor(Math.random() * 20) + 10,
      location: item.location || `Location ${Math.floor(Math.random() * 3) + 1}`,
      severity: item.severity || (['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low'),
      createdAt: item.createdAt || new Date(Date.now() - Math.random() * 86400000).toISOString()
    }));
  },
  
  transformError(error): string {
    return `Failed to load inventory alerts: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};


/**
 * Chart Data Adapter - Transforms various data to chart format
 */
export function transformToChartData(data: Record<string, number>): DashboardChartData[] {
  return Object.entries(data).map(([label, value]) => ({
    label,
    value
  }));
}

/**
 * Time Series Adapter - Transforms time-based data for trend charts
 */
export function transformTimeSeriesData(data: Array<{ date: string; value: number }>): DashboardChartData[] {
  return data.map(point => ({
    label: new Date(point.date).toLocaleDateString('en-EG', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: point.value
  }));
}

/**
 * Relative time formatting for last sync/order times
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-EG', { 
    month: 'short', 
    day: 'numeric' 
  });
}

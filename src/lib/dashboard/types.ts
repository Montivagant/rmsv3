// Dashboard Types and Interfaces
export interface DashboardQuery {
  tab: 'general' | 'branches' | 'inventory';
  period: 'day' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  branches: string[]; // Branch IDs, empty array means all branches
  compare: boolean;
}

export interface DashboardKPI {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparkline?: number[];
  link?: string;
}

export interface DashboardChartData {
  label: string;
  value: number;
  color?: string;
}

export interface BranchHealthData {
  id: string;
  name: string;
  activeOrders: number;
  activeOrdersAmount: number;
  occupiedTables: number;
  offlineCashiers: number;
  openTills: number;
  lastSync: string;
  lastOrder: string;
  status: 'online' | 'offline' | 'warning';
}

export interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'expiring' | 'out_of_stock';
  itemName: string;
  currentLevel: number;
  minimumLevel: number;
  location?: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
}


// Data adapter interfaces for transforming API responses to UI needs
export interface DashboardAdapter<TApiResponse, TUIData> {
  transform(apiData: TApiResponse): TUIData;
  transformError(error: unknown): string;
}

// Mock data interfaces (to be replaced with real API responses)
export interface MockOrderData {
  count: number;
  amount: number;
  trend: number;
}

export interface MockSalesData {
  netSales: number;
  netPayments: number;
  returns: number;
  discounts: number;
}

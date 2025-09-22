import { createRemoteClient } from '../../data/remote/client';
import type { DashboardKPI, DashboardKPITrend } from './types';
import { formatCount } from '../../hooks/useAnalytics';

export async function getOrdersKPI(params: { from?: string; to?: string } = {}): Promise<DashboardKPI> {
  const client = createRemoteClient();
  // Expected projection response shape: { count: number, trend?: number }
  const data = await client.getProjection<{ count: number; trend?: number }>('orders.kpi', params);
  
  const trendData: DashboardKPITrend | undefined = data.trend == null 
    ? undefined 
    : { value: Math.abs(data.trend), isPositive: data.trend > 0 };

  const kpi: DashboardKPI = {
    title: 'Orders',
    value: (data.count ?? 0).toLocaleString(),
    subtitle: formatCount(data.count ?? 0, 'completed order'),
    link: '/orders/active',
  };

  if (trendData) {
    kpi.trend = trendData;
  }

  return kpi;
}


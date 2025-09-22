/**
 * Analytics Hooks
 * 
 * React hooks for consuming real-time analytics data from the
 * analytics repository instead of mock data.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getDashboardAnalytics,
  type DashboardAnalytics 
} from '../analytics/repository';
import { logger } from '../shared/logger';

interface UseAnalyticsOptions {
  period?: 'today' | 'yesterday' | 'week' | 'month';
  refreshInterval?: number; // in milliseconds, default 5 minutes
  enabled?: boolean;
}

interface UseAnalyticsReturn {
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    period = 'today',
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    enabled = true
  } = options;

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getDashboardAnalytics(period);
      setAnalytics(data);
      setLastUpdated(Date.now());
      
      logger.debug('Analytics data refreshed', { 
        period, 
        ordersCount: data.ordersKpi.count,
        salesAmount: data.salesKpi.netSales 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      logger.error('Failed to fetch analytics', { period, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [period, enabled]);

  const refresh = async () => {
    setLoading(true);
    await fetchAnalytics();
  };

  useEffect(() => {
    fetchAnalytics();
    
    if (enabled && refreshInterval > 0) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, enabled, refreshInterval]);

  return {
    analytics,
    loading,
    error,
    refresh,
    lastUpdated
  };
}

// Specialized hooks for specific analytics
export function useOrdersAnalytics(period: 'today' | 'yesterday' | 'week' | 'month' = 'today') {
  const { analytics, loading, error, refresh } = useAnalytics({ period });
  
  return {
    ordersKpi: analytics?.ordersKpi || null,
    loading,
    error,
    refresh
  };
}

export function useSalesAnalytics(period: 'today' | 'yesterday' | 'week' | 'month' = 'today') {
  const { analytics, loading, error, refresh } = useAnalytics({ period });
  
  return {
    salesKpi: analytics?.salesKpi || null,
    loading,
    error,
    refresh
  };
}

export function useTopProductsAnalytics(period: 'today' | 'yesterday' | 'week' | 'month' = 'today') {
  const { analytics, loading, error, refresh } = useAnalytics({ period });
  
  return {
    topProducts: analytics?.topProducts || [],
    loading,
    error,
    refresh
  };
}

export function usePaymentAnalytics(period: 'today' | 'yesterday' | 'week' | 'month' = 'today') {
  const { analytics, loading, error, refresh } = useAnalytics({ period });
  
  return {
    paymentMethods: analytics?.paymentMethods || [],
    loading,
    error,
    refresh
  };
}

export function useBranchAnalytics(period: 'today' | 'yesterday' | 'week' | 'month' = 'today') {
  const { analytics, loading, error, refresh } = useAnalytics({ period });
  
  return {
    branchPerformance: analytics?.branchPerformance || [],
    loading,
    error,
    refresh
  };
}

// Helper functions to format analytics data for UI components
export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  if (currency === 'EGP') {
    return `${amount.toLocaleString()} EGP`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatCount(count: number, singular: string, plural?: string): string {
  const unit = count === 1 ? singular : (plural || `${singular}s`);
  return `${count.toLocaleString()} ${unit}`;
}

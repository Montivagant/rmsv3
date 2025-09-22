// Dashboard Query State Management with URL Persistence
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DashboardQuery } from './types';

const DEFAULT_QUERY: DashboardQuery = {
  tab: 'general',
  period: 'day',
  branches: [], // Empty array means all branches
  compare: false
};

/**
 * Custom hook for managing dashboard query state with URL persistence
 * Provides type-safe access to query parameters with sensible defaults
 */
export function useDashboardQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse current query state from URL
  const query = useMemo((): DashboardQuery => {
    const tab = searchParams.get('tab');
    const period = searchParams.get('period');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branches = searchParams.get('branches');
    const compare = searchParams.get('compare');
    
    const newQuery: DashboardQuery = {
      tab: (tab === 'general' || tab === 'branches' || tab === 'inventory') 
        ? tab : DEFAULT_QUERY.tab,
      period: (period === 'day' || period === 'week' || period === 'month' || period === 'custom') 
        ? period : DEFAULT_QUERY.period,
      branches: branches ? branches.split(',').filter(Boolean) : DEFAULT_QUERY.branches,
      compare: compare === 'true'
    };

    if (startDate) newQuery.startDate = startDate;
    if (endDate) newQuery.endDate = endDate;

    return newQuery;
  }, [searchParams]);
  
  // Update specific query parameters
  const updateQuery = useCallback((updates: Partial<DashboardQuery>) => {
    setSearchParams((current) => {
      const newParams = new URLSearchParams(current);
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          newParams.delete(key);
        } else if (key === 'branches' && Array.isArray(value)) {
          if (value.length === 0) {
            newParams.delete(key);
          } else {
            newParams.set(key, value.join(','));
          }
        } else if (typeof value === 'boolean') {
          if (value) {
            newParams.set(key, 'true');
          } else {
            newParams.delete(key);
          }
        } else {
          newParams.set(key, String(value));
        }
      });
      
      return newParams;
    });
  }, [setSearchParams]);
  
  // Convenience methods for common operations
  const setTab = useCallback((tab: DashboardQuery['tab']) => {
    updateQuery({ tab });
  }, [updateQuery]);
  
  const setPeriod = useCallback((period: DashboardQuery['period']) => {
    const updates: Partial<DashboardQuery> = { period };
    if (period !== 'custom') {
      const update: Partial<DashboardQuery> = { period };
      // Clear dates when switching away from custom
      updateQuery(update);
    } else {
      updateQuery(updates);
    }
  }, [updateQuery]);
  
  const setDateRange = useCallback((startDate: string, endDate: string) => {
    updateQuery({ 
      period: 'custom', 
      startDate, 
      endDate 
    });
  }, [updateQuery]);
  
  const setBranches = useCallback((branches: string[]) => {
    updateQuery({ branches });
  }, [updateQuery]);
  
  const toggleCompare = useCallback(() => {
    updateQuery({ compare: !query.compare });
  }, [updateQuery, query.compare]);
  
  const resetQuery = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);
  
  // Derived values for UI
  const dateRange = useMemo(() => {
    if (query.period === 'custom' && query.startDate && query.endDate) {
      return {
        start: new Date(query.startDate),
        end: new Date(query.endDate)
      };
    }
    
    const end = new Date();
    const start = new Date();
    
    switch (query.period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }
    
    return { start, end };
  }, [query.period, query.startDate, query.endDate]);
  
  const periodLabel = useMemo(() => {
    switch (query.period) {
      case 'day':
        return 'Today';
      case 'week':
        return 'Last 7 days';
      case 'month':
        return 'This month';
      case 'custom':
        if (query.startDate && query.endDate) {
          const start = new Date(query.startDate);
          const end = new Date(query.endDate);
          return `${start.toLocaleDateString('en-EG', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-EG', { month: 'short', day: 'numeric' })}`;
        }
        return 'Custom range';
      default:
        return 'Today';
    }
  }, [query.period, query.startDate, query.endDate]);
  
  const branchesLabel = useMemo(() => {
    if (query.branches.length === 0) {
      return 'All branches';
    }
    if (query.branches.length === 1) {
      return `1 branch`;
    }
    return `${query.branches.length} branches`;
  }, [query.branches]);
  
  return {
    query,
    dateRange,
    periodLabel,
    branchesLabel,
    setTab,
    setPeriod,
    setDateRange,
    setBranches,
    toggleCompare,
    updateQuery,
    resetQuery
  };
}

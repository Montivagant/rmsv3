import { useMemo } from 'react';
import type { NavItem } from 'config/nav.config';
import { useRepository } from './useRepository';
import { getActiveOrders } from '../orders/repository';
import type { OrderState } from '../orders/types';

export interface BadgeData {
  count: number;
  variant: 'primary' | 'danger' | 'warning' | 'info';
}

export function useNavigationBadges(badgeId: NavItem['id']): BadgeData | null {
  const { data: activeOrders, loading } = useRepository<OrderState[]>(getActiveOrders, []);

  const badgeData = useMemo((): BadgeData | null => {
    switch (badgeId) {
      case 'orders':
      case 'ordersCount':
        if (loading || !activeOrders) return null;
        return {
          count: activeOrders.length,
          variant: activeOrders.length > 0 ? 'primary' : 'info',
        };
      default:
        return null;
    }
  }, [badgeId, activeOrders, loading]);

  return badgeData;
}

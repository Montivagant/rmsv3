import { useCallback, useEffect, useState } from 'react';
import type { OrderQuery, OrderState } from '../orders/types';
import { listOrders } from '../orders/repository';

interface UseOrdersState {
  orders: OrderState[];
  loading: boolean;
  error: string | null;
}

export function useOrders(query: OrderQuery = {}): UseOrdersState & { refetch: () => Promise<void> } {
  const [orders, setOrders] = useState<OrderState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const data = await listOrders(query);
      if (signal?.cancelled) return;
      setOrders(data);
      setError(null);
    } catch (err) {
      if (signal?.cancelled) return;
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      if (signal?.cancelled) return;
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const token = { cancelled: false };
    load(token);
    return () => {
      token.cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    await load();
  }, [load]);

  return { orders, loading, error, refetch };
}

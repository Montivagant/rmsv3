import { useCallback, useEffect, useState } from 'react';
import type { MenuItem } from '../menu/items/types';
import { getMenuItems } from '../menu/items/repository';

interface UseMenuItemsOptions {
  branchId?: string;
  includeInactive?: boolean;
}

interface UseMenuItemsState {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
}

export function useMenuItems(options: UseMenuItemsOptions = {}): UseMenuItemsState & { refetch: () => Promise<void> } {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const query: Parameters<typeof getMenuItems>[0] = {
        page: 1,
        pageSize: 500,
      };
      if (options.branchId) {
        query.branchId = options.branchId;
      }
      if (options.includeInactive === false) {
        query.isActive = true;
      }
      const response = await getMenuItems(query);
      if (signal?.cancelled) return;
      setItems(response.items);
      setError(null);
    } catch (err) {
      if (signal?.cancelled) return;
      setError(err instanceof Error ? err.message : 'Failed to load menu');
      setItems([]);
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
      }
    }
  }, [options.branchId, options.includeInactive]);

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

  return { items, loading, error, refetch };
}

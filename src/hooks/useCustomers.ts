import { useCallback, useEffect, useState } from 'react';
import type { CustomerRecord } from '../customers/repository';
import { listCustomers, searchCustomers as repositorySearch } from '../customers/repository';

interface UseCustomersState {
  customers: CustomerRecord[];
  loading: boolean;
  error: string | null;
}

export function useCustomers(): UseCustomersState & {
  refetch: () => Promise<void>;
  searchCustomers: (query: string) => Promise<CustomerRecord[]>;
} {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const data = await listCustomers();
      if (signal?.cancelled) return;
      setCustomers(data);
      setError(null);
    } catch (err) {
      if (signal?.cancelled) return;
      setCustomers([]);
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
      }
    }
  }, []);

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

  const search = useCallback(async (query: string) => {
    if (!query) return customers;
    return repositorySearch(query);
  }, [customers]);

  return {
    customers,
    loading,
    error,
    refetch,
    searchCustomers: search,
  };
}

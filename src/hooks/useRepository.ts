import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRepositoryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseRepositoryReturn<T> extends UseRepositoryState<T> {
  refetch: () => Promise<void>;
}

/**
 * Typed hook for repository-based data fetching
 * Replaces useApi with event-store backed repositories
 */
export function useRepository<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): UseRepositoryReturn<T> {
  const [state, setState] = useState<UseRepositoryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await fetcherRef.current();
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('Repository fetch error:', errorMessage);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return {
    ...state,
    refetch: fetchData,
  };
}

/**
 * Hook for repository-based mutations
 */
export function useRepositoryMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (input: TInput): Promise<TOutput> => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutator(input);
      setLoading(false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mutation failed';
      setError(errorMessage);
      setLoading(false);
      throw error;
    }
  };

  return {
    mutate,
    loading,
    error,
    reset: () => {
      setLoading(false);
      setError(null);
    }
  };
}

/**
 * Hook for multiple repository operations
 */
export function useRepositoryQueries<T extends Record<string, any>>(
  queries: { [K in keyof T]: () => Promise<T[K]> },
  deps: React.DependencyList = []
): { [K in keyof T]: UseRepositoryReturn<T[K]> } {
  const [states, setStates] = useState<{ [K in keyof T]: UseRepositoryState<T[K]> }>(
    () => Object.fromEntries(
      Object.keys(queries).map(key => [key, { data: null, loading: true, error: null }])
    ) as any
  );

  const fetchAll = async () => {
    const results = await Promise.allSettled(
      Object.entries(queries).map(async ([key, fetcher]) => {
        try {
          const data = await fetcher();
          return { key, data, error: null };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          return { key, data: null, error: errorMessage };
        }
      })
    );

    const newStates: any = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { key, data, error } = result.value;
        newStates[key] = { data, loading: false, error };
      } else {
        // This shouldn't happen since we handle errors above
        const key = Object.keys(queries)[results.indexOf(result)];
        newStates[key] = { data: null, loading: false, error: 'Unknown error' };
      }
    }

    setStates(newStates);
  };

  const refetchAll = async () => {
    setStates(prev => 
      Object.fromEntries(
        Object.keys(prev).map(key => [key, { ...prev[key], loading: true, error: null }])
      ) as any
    );
    await fetchAll();
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Create refetch functions for individual queries
  const result: any = {};
  for (const key of Object.keys(queries)) {
    result[key] = {
      ...states[key],
      refetch: async () => {
        try {
          setStates(prev => ({ ...prev, [key]: { ...prev[key], loading: true, error: null } }));
          const data = await queries[key]();
          setStates(prev => ({ ...prev, [key]: { data, loading: false, error: null } }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          setStates(prev => ({ ...prev, [key]: { data: null, loading: false, error: errorMessage } }));
        }
      }
    };
  }

  result.refetchAll = refetchAll;
  return result;
}

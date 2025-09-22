import { useState, useEffect, useRef } from 'react';
import { fetchJSON, postJSON, patchJSON, deleteJSON } from '../api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
}

export function useApi<T>(url: string, defaultValue?: T): UseApiReturn<T> {
  // Use a ref to store defaultValue to avoid dependency issues
  const defaultValueRef = useRef(defaultValue);
  
  const [state, setState] = useState<UseApiState<T>>({
    data: defaultValueRef.current || null,
    loading: true,
    error: null,
  });

  const fetchData = async (_retryCount = 0) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Safety check for empty URL
      if (!url) {
        console.warn('Empty URL provided to useApi hook');
        setState({ 
          data: defaultValueRef.current || null, 
          loading: false, 
          error: 'Invalid API endpoint' 
        });
        return;
      }
      
      if (import.meta.env.DEV && import.meta.env.VITE_CONSOLE_LOGGING !== 'false') {
        console.log(`🔄 Fetching: ${url}`);
      }
      const data = await fetchJSON(url);
      
      // Ensure we have valid data
      if (data === null || data === undefined) {
        console.warn(`API ${url} returned null or undefined data`);
        setState({ 
          data: defaultValueRef.current || null, 
          loading: false, 
          error: 'API returned no data' 
        });
        return;
      }
      
      if (import.meta.env.DEV && import.meta.env.VITE_CONSOLE_LOGGING !== 'false') {
        console.log(`✅ Success: ${url}`);
      }
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error(`❌ Error fetching data from ${url}: ${errorMessage}`);
      setState({
        data: defaultValueRef.current || null,
        loading: false,
        error: errorMessage,
      });
    }
  };

  // Update ref if defaultValue changes
  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);
  
  useEffect(() => {
    if (url) {
      fetchData();
    } else {
      setState({
        data: defaultValueRef.current || null,
        loading: false,
        error: 'Invalid API endpoint'
      });
    }
    // Intentionally omit defaultValue from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return {
    ...state,
    refetch: () => fetchData(0),
  };
}

export async function apiPost<T>(url: string, data: any): Promise<T> {
  return postJSON<T>(url, data);
}

export async function apiPatch<T>(url: string, data: any): Promise<T> {
  return patchJSON<T>(url, data);
}

export async function apiDelete<T>(url: string): Promise<T> {
  return deleteJSON<T>(url);
}
import React, { useState, useEffect, useRef } from 'react';

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

  const fetchData = async (retryCount = 0) => {
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
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`❌ Expected JSON but got ${contentType} for ${url}`);
        console.error(`📄 Response preview: ${text.substring(0, 100)}...`);
        
        // Check if we got HTML instead of JSON (likely MSW not ready)
        if (text.includes('<!doctype html>') || text.includes('<html')) {
          // Retry once after a short delay if this is the first attempt
          if (retryCount === 0) {
            console.log('⏳ MSW not ready, retrying in 500ms...');
            setTimeout(() => fetchData(1), 500);
            return;
          }
          throw new Error(`API not ready - try refreshing the page or switch to Advanced Dashboard`);
        }
        
        throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}`);
      }
      
      const data = await response.json();
      
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
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function apiPatch<T>(url: string, data: any): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
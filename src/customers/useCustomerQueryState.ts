import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CustomerFilters, QueryState } from './types';

const DEFAULT_STATE: QueryState = {
  page: 1,
  pageSize: 25,
  search: '',
  sort: 'name:asc',
  filters: {},
};

function parseNumber(value: string | null, fallback: number) {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function useCustomerQueryState() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const state: QueryState = useMemo(() => {
    const page = parseNumber(params.get('page'), DEFAULT_STATE.page);
    const pageSize = parseNumber(params.get('pageSize'), DEFAULT_STATE.pageSize);
    const search = params.get('search') || DEFAULT_STATE.search;
    const sort = params.get('sort') || DEFAULT_STATE.sort;
    let filters: CustomerFilters = {};
    const filtersRaw = params.get('filters');
    if (filtersRaw) {
      try {
        filters = JSON.parse(filtersRaw);
      } catch {
        filters = {};
      }
    }
    return { page, pageSize, search, sort, filters };
  }, [params]);

  const setState = (updates: Partial<QueryState>) => {
    const url = new URL(window.location.href);
    const next: QueryState = { ...state, ...updates };
    url.searchParams.set('page', String(next.page));
    url.searchParams.set('pageSize', String(next.pageSize));
    url.searchParams.set('search', next.search || '');
    url.searchParams.set('sort', next.sort || DEFAULT_STATE.sort);
    if (next.filters && Object.keys(next.filters).length > 0) {
      url.searchParams.set('filters', JSON.stringify(next.filters));
    } else {
      url.searchParams.delete('filters');
    }
    navigate(url.pathname + url.search, { replace: true });
  };

  // Debounced search state for UX
  const [searchInput, setSearchInput] = useState(state.search);
  useEffect(() => {
    setSearchInput(state.search);
     
  }, [state.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== state.search) {
        setState({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return {
    state,
    setState,
    searchInput,
    setSearchInput,
  };
}

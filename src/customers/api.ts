import type { CustomersResponse, QueryState } from './types';

function buildQuery(state: QueryState): string {
  const params = new URLSearchParams();
  params.set('page', String(state.page));
  params.set('pageSize', String(state.pageSize));
  if (state.search) params.set('search', state.search);
  if (state.sort) params.set('sort', state.sort);
  if (state.filters && Object.keys(state.filters).length > 0) {
    params.set('filters', JSON.stringify(state.filters));
  }
  return params.toString();
}

export async function fetchCustomers(state: QueryState): Promise<CustomersResponse> {
  const qs = buildQuery(state);
  const res = await fetch(`/api/customers?${qs}`);
  if (!res.ok) {
    throw new Error(`Failed to load customers (${res.status})`);
  }
  const data = (await res.json()) as CustomersResponse;
  return data;
}

export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  orders?: number;
  totalSpent?: number;
  points?: number;
  status?: CustomerStatus;
}

export interface CustomersResponse {
  data: Customer[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CustomerFilters {
  // simplified: no status/tags/recency
}

export interface QueryState {
  page: number;
  pageSize: number;
  search: string;
  sort: string; // "column:dir"
  filters: CustomerFilters;
}

export type SortDir = 'asc' | 'desc';

export interface TableColumnDef<TData> {
  id: string;
  header: string;
  accessorKey?: keyof TData;
  enableSorting?: boolean;
}

export interface BulkAction {
  id: 'export';
  label: string;
}

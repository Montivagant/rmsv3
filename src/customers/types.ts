export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  orders: number;
  totalSpent: number;
  visits: number;
  points: number;
  lastVisit: string; // ISO date
  status?: CustomerStatus;
  tags?: string[];
}

export interface CustomersResponse {
  data: Customer[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CustomerFilters {
  status?: CustomerStatus[];
  tags?: string[];
  spend?: [number | null, number | null];
  visitRecency?: string; // e.g. "30d"
  signup?: [string | null, string | null]; // ISO from,to (optional, reserved)
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
  id: 'export' | 'activate' | 'deactivate' | 'add_tag';
  label: string;
}

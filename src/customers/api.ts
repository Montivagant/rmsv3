import type { CustomersResponse, QueryState } from './types';
import type { CustomerRecord } from './repository';
import { listCustomers } from './repository';

function applySearch(customers: CustomerRecord[], term: string | undefined): CustomerRecord[] {
  const query = term?.trim().toLowerCase();
  if (!query) return customers;
  return customers.filter((customer) => {
    const haystack = `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase();
    return haystack.includes(query);
  });
}

function applySort(customers: CustomerRecord[], sort: string | undefined): CustomerRecord[] {
  if (!sort) return customers;
  const [column, dir = 'asc'] = sort.split(':');
  const multiplier = dir === 'desc' ? -1 : 1;
  return [...customers].sort((a, b) => {
    switch (column) {
      case 'totalSpent':
        return ((a.totalSpent ?? 0) - (b.totalSpent ?? 0)) * multiplier;
      case 'orders':
        return ((a.orders ?? 0) - (b.orders ?? 0)) * multiplier;
      case 'points':
        return ((a.points ?? 0) - (b.points ?? 0)) * multiplier;
      case 'name':
      default:
        return a.name.localeCompare(b.name) * multiplier;
    }
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): { data: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
  };
}

export async function fetchCustomers(state: QueryState): Promise<CustomersResponse> {
  const raw = await listCustomers();
  const searched = applySearch(raw, state.search);
  const sorted = applySort(searched, state.sort);
  const page = state.page ?? 1;
  const pageSize = state.pageSize ?? 25;
  const { data, total } = paginate(sorted, page, pageSize);

  return {
    data: data.map(customer => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      orders: customer.orders,
      totalSpent: customer.totalSpent,
      points: customer.points,
    })),
    page,
    pageSize,
    total,
  };
}

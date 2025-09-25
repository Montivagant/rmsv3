import { bootstrapEventStore } from '../bootstrap/persist';
import { stableHash } from '../events/hash';
import { getBaseEventType } from '../events/validation';
import type {
  CustomerProfileUpsertedEvent,
  SaleRecordedEvent,
} from '../events/types';

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  orders: number;
  totalSpent: number;
  visits: number;
  lastVisit?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

type CustomerState = CustomerRecord;

function ensureState(map: Map<string, CustomerState>, id: string): CustomerState {
  const existing = map.get(id);
  if (existing) return existing;
  const fallback: CustomerState = {
    id,
    name: id,
    email: '',
    phone: '',
    points: 0,
    orders: 0,
    totalSpent: 0,
    visits: 0,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  map.set(id, fallback);
  return fallback;
}

async function loadCustomerMap(): Promise<Map<string, CustomerState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, CustomerState>();

  for (const event of events) {
    const baseType = getBaseEventType(event.type);
    if (baseType === 'customer.profile.upserted') {
      const payload = (event as CustomerProfileUpsertedEvent).payload;
      const record: CustomerState = {
        id: payload.customerId,
        name: payload.name,
        email: payload.email ?? '',
        phone: payload.phone ?? '',
        points: 0,
        visits: payload.visits ?? 0,
        orders: payload.visits ?? 0,
        totalSpent: payload.totalSpent ?? 0,
        lastVisit: payload.lastVisit ?? 0,
        tags: payload.tags ?? [],
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      };
      map.set(payload.customerId, record);
      continue;
    }

    // Loyalty removed

    if (baseType === 'sale.recorded') {
      const payload = (event as SaleRecordedEvent).payload;
      const customerId = payload.customerId;
      if (!customerId) continue;
      const record = ensureState(map, customerId);
      record.orders += 1;
      record.visits += 1;
      record.totalSpent += payload.totals?.total ?? 0;
      record.lastVisit = event.at;
      record.updatedAt = event.at;
      if (!record.name || record.name === record.id) {
        record.name = record.id;
      }
      continue;
    }
  }

  return map;
}

export async function listCustomers(): Promise<CustomerRecord[]> {
  const map = await loadCustomerMap();
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchCustomers(query: string): Promise<CustomerRecord[]> {
  const term = query.trim().toLowerCase();
  if (!term) return listCustomers();
  const customers = await listCustomers();
  return customers.filter(customer => {
    const haystack = `${customer.name} ${customer.email ?? ''} ${customer.phone ?? ''}`.toLowerCase();
    return haystack.includes(term);
  });
}

export interface UpsertCustomerInput {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
}


export async function upsertCustomerProfile(input: UpsertCustomerInput): Promise<CustomerRecord> {
  const stateBefore = await loadCustomerMap();
  const existing = stateBefore.get(input.id);
  const { store } = await bootstrapEventStore();
  const now = Date.now();
  const payload: CustomerProfileUpsertedEvent['payload'] = {
    customerId: input.id,
    name: input.name,
    email: input.email ?? '',
    phone: input.phone ?? '',
    visits: existing?.visits ?? 0,
    totalSpent: existing?.totalSpent ?? 0,
    lastVisit: existing?.lastVisit ?? 0,
    tags: input.tags ?? existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  store.append('customer.profile.upserted', payload, {
    key: `customer:profile:${input.id}:${stableHash(payload)}`,
    params: payload,
    aggregate: { id: input.id, type: 'customer' },
  });

  const refreshed = await loadCustomerMap();
  return refreshed.get(input.id)!;
}


// Loyalty removed: adjustCustomerPoints no longer supported

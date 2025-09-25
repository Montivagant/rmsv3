import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Event } from '../../events/types';
import { listCustomers, searchCustomers, upsertCustomerProfile } from '../../customers/repository';
import { resetEventStoreMock, seedEvent } from '../utils/mockEventStore';

const baseTime = new Date('2025-01-01T00:00:00Z');

describe('customers repository', () => {
  beforeEach(() => {
    resetEventStoreMock();
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const pushEvent = (event: Event) => {
    seedEvent(event);
  };

  it('aggregates customer metrics from events', async () => {
    const profileTime = baseTime.getTime() - 60_000;
    pushEvent({
      id: 'evt-1',
      seq: 1,
      type: 'customer.profile.upserted',
      at: profileTime,
      aggregate: { id: 'cust-1', type: 'customer' },
      payload: {
        customerId: 'cust-1',
        name: 'Amelia Nassar',
        email: 'amelia@example.com',
        phone: '+20 100 000 0000',
        // loyalty removed
        visits: 2,
        totalSpent: 150,
        createdAt: profileTime,
        updatedAt: profileTime,
        lastVisit: profileTime,
      },
    } as Event);

    const saleTime = baseTime.getTime() - 10_000;
    pushEvent({
      id: 'evt-2',
      seq: 2,
      type: 'sale.recorded',
      at: saleTime,
      aggregate: { id: 'T-100', type: 'ticket' },
      payload: {
        ticketId: 'T-100',
        totals: { subtotal: 100, discount: 10, tax: 5, total: 95 },
        customerId: 'cust-1',
      },
    } as Event);

    // loyalty adjusted event removed

    const customers = await listCustomers();
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      id: 'cust-1',
      name: 'Amelia Nassar',
      email: 'amelia@example.com',
      phone: '+20 100 000 0000',
      // points removed
      orders: 2,
      visits: 3,
      totalSpent: 245,
      lastVisit: saleTime,
    });

    const searchResults = await searchCustomers('amelia');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe('cust-1');
  });

  it('upserts and lists customers (loyalty removed)', async () => {
    const profileTime = baseTime.getTime() - 30_000;
    pushEvent({
      id: 'evt-1',
      seq: 1,
      type: 'customer.profile.upserted',
      at: profileTime,
      aggregate: { id: 'cust-42', type: 'customer' },
      payload: {
        customerId: 'cust-42',
        name: 'Lina Farouk',
        email: 'lina@example.com',
        phone: '+20 109 000 0000',
        // loyalty removed
        visits: 1,
        totalSpent: 75,
        createdAt: profileTime,
        updatedAt: profileTime,
      },
    } as Event);

    const customers = await listCustomers();
    expect(customers.find(c => c.id === 'cust-42')).toBeTruthy();
  });

  it('upserts customer profile preserving existing aggregates', async () => {
    const base = baseTime.getTime() - 120_000;
    pushEvent({
      id: 'evt-1',
      seq: 1,
      type: 'customer.profile.upserted',
      at: base,
      aggregate: { id: 'cust-9', type: 'customer' },
      payload: {
        customerId: 'cust-9',
        name: 'Legacy Name',
        email: 'legacy@example.com',
        phone: '',
        // loyalty removed
        visits: 5,
        totalSpent: 500,
        createdAt: base,
        updatedAt: base,
      },
    } as Event);

    const result = await upsertCustomerProfile({
      id: 'cust-9',
      name: 'Updated Name',
      email: 'updated@example.com',
    });

    expect(result).toMatchObject({
      id: 'cust-9',
      name: 'Updated Name',
      email: 'updated@example.com',
      // points removed
      visits: 5,
      totalSpent: 500,
    });
  });
});

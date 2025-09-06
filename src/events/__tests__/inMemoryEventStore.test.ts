import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventStore } from '../store';
import type { Event } from '../types';
import { IdempotencyConflictError } from '../types';

describe('InMemoryEventStore - Idempotency and Sequencing', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  it('dedup: same key + same params returns existing event (isNew=false, deduped=true)', () => {
    const first = store.append('TEST_EVENT', { data: 1 }, {
      key: 'k1',
      params: { p: 1 },
      aggregate: { id: 'agg-1', type: 'test' }
    });

    expect(first.isNew).toBe(true);
    expect(first.deduped).toBe(false);

    const second = store.append('TEST_EVENT', { data: 1 }, {
      key: 'k1',
      params: { p: 1 },
      aggregate: { id: 'agg-1', type: 'test' }
    });

    expect(second.isNew).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.event.id).toBe(first.event.id);
  });

  it('conflict: same key + different params throws IdempotencyConflictError', () => {
    store.append('TEST_EVENT', { data: 1 }, {
      key: 'k2',
      params: { p: 1 },
      aggregate: { id: 'agg-2', type: 'test' }
    });

    expect(() => {
      store.append('TEST_EVENT', { data: 2 }, {
        key: 'k2',
        params: { p: 2 }, // different params -> different hash
        aggregate: { id: 'agg-2', type: 'test' }
      });
    }).toThrow(IdempotencyConflictError);
  });

  it('getByIdempotencyKey returns { eventId, paramsHash } with correct eventId', () => {
    const r = store.append('TEST_EVENT', { n: 1 }, {
      key: 'k3',
      params: { a: 1 },
      aggregate: { id: 'agg-3', type: 'test' }
    });

    const rec = store.getByIdempotencyKey('k3');
    expect(rec).toBeTruthy();
    expect(rec!.eventId).toBe(r.event.id);
    expect(typeof rec!.paramsHash).toBe('string');
    expect(rec!.paramsHash.length).toBeGreaterThan(0);
  });

  it('ingest + append produce continuous sequence numbers (no gaps)', () => {
    // Start with one event to set initial sequence
    const r1 = store.append('E1', {}, {
      key: 's1',
      params: {},
      aggregate: { id: 'agg-s', type: 'test' }
    });

    // Ingest an external event with a specific sequence
    const externalEvent: Event = {
      id: 'evt_external_001',
      seq: r1.event.seq + 1,
      type: 'EXTERNAL',
      at: Date.now(),
      aggregate: { id: 'agg-s', type: 'test' },
      payload: { source: 'external' }
    };
    store.ingest(externalEvent);

    // Next append should use external seq + 1
    const r2 = store.append('E2', {}, {
      key: 's2',
      params: {},
      aggregate: { id: 'agg-s', type: 'test' }
    });

    expect(r2.event.seq).toBe(externalEvent.seq + 1);
  });

  it('append without idempotency key works but is non-idempotent', () => {
    const a = store.append('NO_KEY', {}, {
      // no key provided
      params: { a: 1 },
      aggregate: { id: 'agg-n', type: 'test' }
    });
    const b = store.append('NO_KEY', {}, {
      // no key provided
      params: { a: 1 },
      aggregate: { id: 'agg-n', type: 'test' }
    });

    expect(a.isNew).toBe(true);
    expect(b.isNew).toBe(true);
    expect(b.event.id).not.toBe(a.event.id);
  });
});

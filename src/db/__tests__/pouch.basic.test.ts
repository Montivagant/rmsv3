import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openLocalDBLegacy } from '../pouch';
import { createSaleRecordedEvent } from '../../test/factories';
import type { PouchDBAdapter } from '../pouch';

describe('PouchDB Basic Operations', () => {
  let adapter: PouchDBAdapter;

  beforeEach(async () => {
    adapter = openLocalDBLegacy('test_events');
  });

  afterEach(async () => {
    await adapter.reset();
  });

  it('put/get events are idempotent', async () => {
    const sample = createSaleRecordedEvent({
      id: 'e1',
      payload: {
        ticketId: 'e1',
        lines: [],
        totals: { subtotal: 0, tax: 0, total: 0, discount: 0 }
      }
    });

    await adapter.putEvent(sample);
    await adapter.putEvent(sample); // idempotent
    const all = await adapter.allEvents();
    expect(all.length).toBe(1);
  });
});
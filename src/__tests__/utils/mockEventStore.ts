import type { Event } from "../../events/types";

const events: Event[] = [];

const store = {
  getAll: () => [...events],
  append: (type: string, payload: any, options: any) => {
    const aggregate = options?.aggregate ?? {
      id: options?.aggregate?.id ?? payload?.aggregate?.id ?? payload?.customerId ?? payload?.sku ?? 'unknown',
      type: options?.aggregate?.type ?? 'unknown',
    };
    const event: Event = {
      id: `evt-${events.length + 1}`,
      seq: events.length + 1,
      type,
      at: Date.now(),
      aggregate,
      payload,
    } as Event;
    events.push(event);
    return { event, deduped: false, isNew: true };
  },
};

export function resetEventStoreMock() {
  events.length = 0;
  (globalThis as any).__RMS_OPTIMIZED_STORE_SINGLETON = { store };
}

export function seedEvent(event: Event) {
  events.push(event);
}

export function getRecordedEvents() {
  return events;
}

export function getMockStore() {
  return store;
}

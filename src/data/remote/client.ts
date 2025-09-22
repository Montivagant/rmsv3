// Minimal remote client with idempotent helpers
export interface RemoteClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
}

export interface KnownEvent {
  id: string;
  seq: number;
  type: string;
  at: number;
  aggregate: { id: string; type: string };
  version?: number;
  payload?: unknown;
}

export interface FetchEventsOptions {
  since?: number;
  limit?: number;
}

export class RemoteClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(opts: RemoteClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async postEvents(events: KnownEvent[]): Promise<void> {
    const idempotencyKey = crypto.randomUUID();
    const res = await this.fetchFn(`${this.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to post events: ${res.status} ${text}`);
    }
  }

  async fetchEvents(options: FetchEventsOptions = {}): Promise<KnownEvent[]> {
    const params = new URLSearchParams();
    if (typeof options.since === 'number') {
      params.set('since', String(options.since));
    }
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    const qs = params.toString();
    const res = await this.fetchFn(`${this.baseUrl}/api/events${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to fetch events: ${res.status} ${text}`);
    }
    const json = await res.json().catch(() => null);
    if (Array.isArray(json)) {
      return json as KnownEvent[];
    }
    if (json && Array.isArray((json as any).events)) {
      return (json as any).events as KnownEvent[];
    }
    return [];
  }

  async getProjection<T>(name: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const qs = params
      ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))
      : '';
    const res = await this.fetchFn(`${this.baseUrl}/api/projections/${encodeURIComponent(name)}${qs}`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to get projection ${name}: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }
}

export function createRemoteClient(): RemoteClient {
  const baseUrl = (import.meta as any).env?.VITE_API_BASE || '';
  if (!baseUrl) {
    // Default to relative for dev/mock
    return new RemoteClient({ baseUrl: '' });
  }
  return new RemoteClient({ baseUrl });
}

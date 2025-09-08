import { expect, beforeAll, afterEach, afterAll } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'
// import { server } from './src/mocks/node' // Disabled due to msw/node resolution issues in Vitest

// Extend expect with jest-axe matchers (cast for Vitest types)
expect.extend(toHaveNoViolations as any)

// Mock localStorage for test environment
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

/**
 * jsdom environment + a11y:
 * - Mock localStorage
 * - Ensure global window/document exist
 */
global.localStorage = new LocalStorageMock() as Storage;

// Minimal fake backend for signup/email endpoints to avoid MSW resolution issues
const emailQueue: Array<{
  to: string;
  subject: string;
  text: string;
  html?: string;
}> = [];

// Patch global fetch to support relative URLs in Node test env and intercept specific endpoints
const originalFetch: typeof fetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const method = (init?.method || 'GET').toUpperCase();
  const base = (globalThis.window?.location?.origin) || 'http://localhost';
  const url = typeof input === 'string' ? new URL(input, base) : (input instanceof URL ? input : new URL(String(input), base));

  // Intercept GET /api/_debug/emails
  if (url.pathname === '/api/_debug/emails' && method === 'GET') {
    return new Response(JSON.stringify({ emails: emailQueue }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Intercept POST /api/auth/signup
  if (url.pathname === '/api/auth/signup' && method === 'POST') {
    try {
      let body: any = undefined;
      if (typeof init?.body === 'string') {
        body = JSON.parse(init.body);
      } else if (init?.body && (init.body as any).toString) {
        // Best effort parse for non-string bodies
        try { body = JSON.parse((init.body as any).toString()); } catch { body = {}; }
      } else {
        body = {};
      }

      const name = String(body?.name ?? 'User');
      const email = String(body?.email ?? 'user@example.com');

      const accountId = `acc_${Date.now()}`;
      const subject = 'Welcome to DashUp — Your account details';
      const text = [
        `Hello ${name},`,
        '',
        `Account ID: ${accountId}`,
        `Login Email: ${email}`,
        '',
        'Next steps: Open the app and log in with these credentials.',
        '— DashUp Team'
      ].join('\n');

      emailQueue.push({ to: email, subject, text });

      return new Response(JSON.stringify({
        userId: `u_${Date.now()}`,
        businessId: `b_${Date.now()}`,
        accountId,
        emailEnqueued: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Fallback to real fetch with resolved absolute URL
  try {
    if (typeof input === 'string' && input.startsWith('/')) {
      return originalFetch(new URL(input, base).toString(), init);
    }
    if (input instanceof URL) {
      return originalFetch(input.toString(), init);
    }
    return originalFetch(input as any, init);
  } catch (_e) {
    const resolved = typeof input === 'string' ? new URL(input, base).toString() : input;
    return originalFetch(resolved as any, init);
  }
}) as typeof fetch;

// Start before all tests
beforeAll(() => {
  // server?.listen({ onUnhandledRequest: 'error' })
  // Clear localStorage and email queue before tests
  localStorage.clear();
  emailQueue.splice(0, emailQueue.length);
})

// Reset after each test `important for test isolation`
afterEach(() => {
  // server?.resetHandlers()
  // Clear localStorage after each test for isolation
  localStorage.clear();
})

// Clean up after all tests are done
afterAll(() => {
  // server?.close()
})
// Silence noisy console output during tests (router future flags, jsdom focus loops)
const originalWarn = console.warn.bind(console)
const originalError = console.error.bind(console)
console.warn = (...args: any[]) => {
  const msg = args?.[0]?.toString?.() || ''
  if (/React Router Future Flag Warning/.test(msg)) return
  originalWarn(...args)
}
console.error = (...args: any[]) => {
  const msg = args?.[0]?.toString?.() || ''
  if (/React Router Future Flag Warning/.test(msg)) return
  if (/Maximum call stack size exceeded/.test(msg)) return
  originalError(...args)
}

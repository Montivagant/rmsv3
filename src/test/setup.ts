import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { vi } from 'vitest';

// Try to import MSW server, but gracefully handle failure
const server: any = null;
try {
  // MSW is initialized in vitest.setup.ts to avoid double initialization
  // Leaving server as null here ensures these hooks are no-ops below
} catch {
  console.log('MSW server not available, running tests without mocking');
}

// Mock window.location for React Router testing
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true
});

// Mock window.history for React Router
Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    length: 1,
    state: null
  },
  writable: true
});

// Mock localStorage with actual storage
const storage = new Map();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) || null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  length: 0,
  key: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true
});

// MSW: start/reset/stop for Node (Vitest) - conditionally
beforeAll(() => {
  if (server) {
    server.listen({ onUnhandledRequest: 'error' });
  }
})
afterEach(() => {
  if (server) {
    server.resetHandlers();
  }
})
afterAll(() => {
  if (server) {
    server.close();
  }
})

// Use real timers by default (fake timers + userEvent need extra config)
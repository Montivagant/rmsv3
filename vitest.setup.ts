import { beforeAll, afterEach, afterAll } from 'vitest'
// import { server } from './src/mocks/node'

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

// Set up localStorage mock
global.localStorage = new LocalStorageMock() as Storage;

// Start server before all tests
beforeAll(() => {
  // server.listen({ onUnhandledRequest: 'error' })
  console.log('MSW setup temporarily disabled for debugging')
  // Clear localStorage before tests
  localStorage.clear();
})

// Reset handlers after each test `important for test isolation`
afterEach(() => {
  // server.resetHandlers()
  // Clear localStorage after each test for isolation
  localStorage.clear();
})

// Clean up after all tests are done
afterAll(() => {
  // server.close()
})

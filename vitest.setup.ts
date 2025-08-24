import { beforeAll, afterEach, afterAll } from 'vitest'
// import { server } from './src/mocks/node'

// Start server before all tests
beforeAll(() => {
  // server.listen({ onUnhandledRequest: 'error' })
  console.log('MSW setup temporarily disabled for debugging')
})

// Reset handlers after each test `important for test isolation`
afterEach(() => {
  // server.resetHandlers()
})

// Clean up after all tests are done
afterAll(() => {
  // server.close()
})
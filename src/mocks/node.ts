import { setupServer } from 'msw/lib/node/index.mjs'
import { handlers } from './handlers'

// This configures a request interception server with the given request handlers.
export const server = setupServer(...handlers)

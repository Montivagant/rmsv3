import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/Toast'
import { EventStoreProvider } from '../events/context'
import { createEventStore } from '../events/store'

export function renderWithProviders(ui: ReactNode, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // Create a fresh event store for each test to ensure isolation
  const testEventStore = createEventStore();
  
  return render(
    <QueryClientProvider client={qc}>
      <EventStoreProvider store={testEventStore}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ToastProvider>
      </EventStoreProvider>
    </QueryClientProvider>
  )
}

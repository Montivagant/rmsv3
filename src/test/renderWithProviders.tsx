import { type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EventStoreProvider } from '../events/context'
import { createInMemoryEventStore } from '../events/store'
import { ToastProvider } from '../components/Toast'

export function renderWithProviders(ui: ReactNode, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const memStore = createInMemoryEventStore()

  return render(
    <ToastProvider>
      <EventStoreProvider store={memStore}>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </QueryClientProvider>
      </EventStoreProvider>
    </ToastProvider>
  )
}

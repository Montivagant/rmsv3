/**
 * Test Context Providers
 * Comprehensive provider setup for testing components that require React contexts
 */

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Mock event store for testing
const mockEventStore = {
  addEvent: vi.fn(),
  getAll: vi.fn(() => []),
  getByAggregateId: vi.fn(() => []),
  getByType: vi.fn(() => []),
  subscribe: vi.fn(() => () => {}),
  getMetrics: vi.fn(() => ({
    queriesExecuted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    indexUsage: {}
  }))
}

// Mock optimized queries
const mockOptimizedQueries = {
  getCustomerById: vi.fn(),
  getProductBySku: vi.fn(),
  getCategoryById: vi.fn(),
  getActiveOrders: vi.fn(),
  getInventoryLevels: vi.fn()
}

// Event Store Context
const EventStoreContext = React.createContext(mockEventStore)

// Optimized Queries Context  
const OptimizedQueriesContext = React.createContext(mockOptimizedQueries)

// Application State Context
const AppStateContext = React.createContext({
  user: { id: '1', name: 'Test User', role: 'admin' },
  settings: { theme: 'light', language: 'en' },
  isOnline: true
})

// Form Context for SmartForm components
const FormContext = React.createContext({
  values: {},
  errors: {},
  touched: {},
  isSubmitting: false,
  setFieldValue: vi.fn(),
  setFieldError: vi.fn(),
  setFieldTouched: vi.fn(),
  submitForm: vi.fn()
})

// Theme Context
const ThemeContext = React.createContext({
  theme: 'light',
  setTheme: vi.fn()
})

// Notification Context
const NotificationContext = React.createContext({
  notifications: [],
  addNotification: vi.fn(),
  removeNotification: vi.fn(),
  clearNotifications: vi.fn()
})

// Accessibility Context
const AccessibilityContext = React.createContext({
  announceToScreenReader: vi.fn(),
  focusElement: vi.fn(),
  registerLandmark: vi.fn(),
  skipLinks: []
})

// Combined Test Providers Component
interface TestProvidersProps {
  children: ReactNode
  initialValues?: Record<string, any>
  queryClient?: QueryClient
  routerProps?: {
    initialEntries?: string[]
    initialIndex?: number
  }
  mockEventStore?: any
  mockOptimizedQueries?: any
}

export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  initialValues = {},
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  }),
  routerProps = {},
  mockEventStore: customMockEventStore = mockEventStore,
  mockOptimizedQueries: customMockOptimizedQueries = mockOptimizedQueries
}) => {
  const formContextValue = {
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    setFieldValue: vi.fn((field: string, value: any) => {
      initialValues[field] = value
    }),
    setFieldError: vi.fn(),
    setFieldTouched: vi.fn(),
    submitForm: vi.fn()
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter {...routerProps}>
        <EventStoreContext.Provider value={customMockEventStore}>
          <OptimizedQueriesContext.Provider value={customMockOptimizedQueries}>
            <AppStateContext.Provider value={{
              user: { id: '1', name: 'Test User', role: 'admin' },
              settings: { theme: 'light', language: 'en' },
              isOnline: true
            }}>
              <ThemeContext.Provider value={{
                theme: 'light',
                setTheme: vi.fn()
              }}>
                <NotificationContext.Provider value={{
                  notifications: [],
                  addNotification: vi.fn(),
                  removeNotification: vi.fn(),
                  clearNotifications: vi.fn()
                }}>
                  <AccessibilityContext.Provider value={{
                    announceToScreenReader: vi.fn(),
                    focusElement: vi.fn(),
                    registerLandmark: vi.fn(),
                    skipLinks: []
                  }}>
                    <FormContext.Provider value={formContextValue}>
                      {children}
                    </FormContext.Provider>
                  </AccessibilityContext.Provider>
                </NotificationContext.Provider>
              </ThemeContext.Provider>
            </AppStateContext.Provider>
          </OptimizedQueriesContext.Provider>
        </EventStoreContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Lightweight providers for simple tests
export const MinimalTestProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false }
      }
    })}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Form-specific providers for form testing
export const FormTestProviders: React.FC<{ 
  children: ReactNode
  initialValues?: Record<string, any>
  onSubmit?: (values: any) => void
}> = ({ children, initialValues = {}, onSubmit = vi.fn() }) => {
  const formContextValue = {
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    setFieldValue: vi.fn(),
    setFieldError: vi.fn(),
    setFieldTouched: vi.fn(),
    submitForm: onSubmit
  }

  return (
    <FormContext.Provider value={formContextValue}>
      <AccessibilityContext.Provider value={{
        announceToScreenReader: vi.fn(),
        focusElement: vi.fn(),
        registerLandmark: vi.fn(),
        skipLinks: []
      }}>
        {children}
      </AccessibilityContext.Provider>
    </FormContext.Provider>
  )
}

// Event store providers for event-related testing
export const EventStoreTestProviders: React.FC<{ 
  children: ReactNode
  mockEvents?: any[]
}> = ({ children, mockEvents = [] }) => {
  const eventStoreValue = {
    ...mockEventStore,
    getAll: vi.fn(() => mockEvents),
    getByAggregateId: vi.fn((id: string) => 
      mockEvents.filter(event => event.aggregateId === id)
    ),
    getByType: vi.fn((type: string) => 
      mockEvents.filter(event => event.type === type)
    )
  }

  return (
    <EventStoreContext.Provider value={eventStoreValue}>
      <OptimizedQueriesContext.Provider value={mockOptimizedQueries}>
        {children}
      </OptimizedQueriesContext.Provider>
    </EventStoreContext.Provider>
  )
}

// Custom render helper for testing with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options: {
    providerProps?: Partial<TestProvidersProps>
    renderOptions?: any
  } = {}
) => {
  const { providerProps = {}, renderOptions = {} } = options
  
  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <TestProviders {...providerProps}>{children}</TestProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Export contexts for direct access in tests
export {
  EventStoreContext,
  OptimizedQueriesContext,
  AppStateContext,
  FormContext,
  ThemeContext,
  NotificationContext,
  AccessibilityContext
}

// Export mock objects for test customization
export {
  mockEventStore,
  mockOptimizedQueries
}

export default TestProviders
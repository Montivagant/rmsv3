import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { Layout } from '../components'
import { test, expect, beforeEach, afterEach } from 'vitest'
import { saveDefaults, saveFlags } from '../lib/flags'
import { setCurrentUser, getCurrentUser } from '../rbac/roles'
import { useUI } from '../store/ui'
import { useFeature } from '../store/flags'
import Settings from '../pages/Settings'
import Login from '../pages/Login'

const Dashboard = lazy(() => import('../pages/Dashboard'))

// Test version of App without Router
function TestApp() {
  const currentUser = getCurrentUser()
  const density = useUI((state) => state.density)
  useFeature('kds')
  
  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    if (!currentUser) {
      return <Login />
    }
    return <>{children}</>
  }
  
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${density === 'compact' ? 'text-sm' : ''}`}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <ProtectedRoute>
              <Suspense fallback={<div>Loading...</div>}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  )
}

function renderApp(initialRoute = '/') {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <TestApp />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

test('Reset to defaults hides KDS link when defaults have kds=false', async () => {
  // Technical defaults say KDS should be OFF
  const newDefaults = { kds: false, loyalty: false, payments: false }
  saveDefaults(newDefaults)

  // User had previously enabled KDS
  saveFlags({ kds: true, loyalty: false, payments: false })

  // Open Settings as an Admin
  setCurrentUser({ id: '1', name: 'Admin', role: 'ADMIN' })
  renderApp('/settings')

  // Update the store's technical defaults to match what we saved
  const { useFlags } = await import('../store/flags')
  useFlags.getState().setTechnicalDefaults(newDefaults)

  // Click the "Reset to defaults" button in Admin Console
  const resetBtn = screen.getByRole('button', { name: /reset to defaults/i })
  fireEvent.click(resetBtn)

  // Wait for the flags to be updated
  await waitFor(() => {
    expect(screen.queryByRole('link', { name: /kds/i })).toBeNull()
  })

  // Also test after a simulated refresh
  cleanup()
  renderApp('/')

  // KDS nav link should still be hidden
  expect(screen.queryByRole('link', { name: /kds/i })).toBeNull()
})

test('Reset to defaults shows KDS link when defaults have kds=true', async () => {
  // Technical defaults say KDS should be ON
  const newDefaults = { kds: true, loyalty: false, payments: false }
  saveDefaults(newDefaults)

  // User had previously disabled KDS
  saveFlags({ kds: false, loyalty: false, payments: false })

  // Open Settings as an Admin
  setCurrentUser({ id: '1', name: 'Admin', role: 'ADMIN' })
  renderApp('/settings')

  // Update the store's technical defaults to match what we saved
  const { useFlags } = await import('../store/flags')
  useFlags.getState().setTechnicalDefaults(newDefaults)

  // Click the "Reset to defaults" button
  const resetBtn = screen.getByRole('button', { name: /reset to defaults/i })
  fireEvent.click(resetBtn)

  // Wait for the flags to be updated
  await waitFor(() => {
    expect(screen.getByRole('link', { name: /kds/i })).toBeInTheDocument()
  })

  // Also test after a simulated refresh
  cleanup()
  renderApp('/')

  // KDS nav link should still be visible
  expect(screen.getByRole('link', { name: /kds/i })).toBeInTheDocument()
})
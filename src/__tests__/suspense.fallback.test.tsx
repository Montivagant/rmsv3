import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { test, expect } from 'vitest'

const Slow = lazy(() => new Promise<any>(res => setTimeout(() => res({ default: () => <h1>Slow</h1> }), 50)))

test('shows accessible loading status while lazy route loads', async () => {
  render(
    <MemoryRouter initialEntries={['/slow']}>
      <Suspense fallback={<div role="status" aria-live="polite">Loading…</div>}>
        <Routes>
          <Route path="/slow" element={<Slow />} />
        </Routes>
      </Suspense>
    </MemoryRouter>
  )
  // Fallback visible first
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.getByText('Loading…')).toBeInTheDocument()
  // Then the page
  expect(await screen.findByRole('heading', { name: /slow/i })).toBeInTheDocument()
})
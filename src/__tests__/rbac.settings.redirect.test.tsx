import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RoleGuard } from '../rbac/guard'
import { Role, setCurrentUser } from '../rbac/roles'
import { test, expect } from 'vitest'

// Use your real pages if available; these lightweight stubs also work:
function Settings() { return <h1>Settings</h1> }
function Login() { return <h1>Login</h1> }

test('unauthorized users are redirected from /settings to /login', async () => {
  // No user => should redirect
  localStorage.removeItem('rms_current_user')
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route
          path="/settings"
          element={<RoleGuard requiredRole={Role.ADMIN}><Settings /></RoleGuard>}
        />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument())
})

test('staff users are redirected from /settings to home', async () => {
  // STAFF user => should redirect to home
  setCurrentUser({ id: '1', name: 'Staff User', role: Role.STAFF })
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route
          path="/settings"
          element={<RoleGuard requiredRole={Role.ADMIN}><Settings /></RoleGuard>}
        />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument())
})

test('admin can access /settings', async () => {
  setCurrentUser({ id: '2', name: 'Admin User', role: Role.ADMIN })
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route
          path="/settings"
          element={<RoleGuard requiredRole={Role.ADMIN}><Settings /></RoleGuard>}
        />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>
  )
  await waitFor(() => expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument())
})
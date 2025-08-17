import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import { setCurrentUser, getCurrentUser, Role } from '../rbac/roles';

// Mock user for testing
const mockUser = {
  id: '1',
  name: 'Test User',
  role: Role.STAFF,
};

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock window.matchMedia for Layout component
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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
});

describe('App Components', () => {
  beforeEach(() => {
    // Clear user before each test
    setCurrentUser(null);
    // Clear localStorage
    localStorage.clear();
    // Clear dark mode class
    document.documentElement.classList.remove('dark');
    // Clear mock navigate
    mockNavigate.mockClear();
  });

  it('renders login page correctly', () => {
    render(<Login />);

    expect(screen.getByText('RMS v3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText('💡 Demo Mode: Use any username/password to login with selected role')).toBeInTheDocument();
  });

  it('renders dashboard when user is authenticated', () => {
    setCurrentUser(mockUser);
    
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome to RMS v3 - Restaurant Management System')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('login form handles user input and submission', () => {
    render(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    // Should set current user
    const currentUser = getCurrentUser();
    expect(currentUser).toBeTruthy();
    expect(currentUser?.name).toBe('testuser');
  });
});
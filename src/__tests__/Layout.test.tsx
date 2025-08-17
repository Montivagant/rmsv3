import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { setCurrentUser } from '../rbac/roles';

// Mock user for testing


// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

// Mock window.matchMedia
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

describe('Layout', () => {
  beforeEach(() => {
    // Clear any existing user
    setCurrentUser(null);
    // Clear dark mode class
    document.documentElement.classList.remove('dark');
    // Clear localStorage
    localStorage.clear();
    // Clear mock navigate
    mockNavigate.mockClear();
  });

  it('renders basic layout structure', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    
    // Check for basic navigation items using more specific selectors
    expect(screen.getByText('RMS v3')).toBeInTheDocument();
    expect(screen.getByText('POS')).toBeInTheDocument();
    expect(screen.getByText('KDS')).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    
    const darkModeToggle = screen.getByLabelText('Switch to dark mode');
    fireEvent.click(darkModeToggle);
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists dark mode preference', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    
    const darkModeToggle = screen.getByLabelText('Switch to dark mode');
    fireEvent.click(darkModeToggle);
    
    expect(localStorage.getItem('darkMode')).toBe('true');
  });

  it('displays current page title', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('banner')).toHaveTextContent('Dashboard');
  });

  it('toggles sidebar collapse', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    
    
    const collapseButton = screen.getByText('←');
    fireEvent.click(collapseButton);
    
    // Sidebar should still contain navigation items even when collapsed
    const sidebarNav = screen.getByLabelText('Main');
    expect(sidebarNav).toBeInTheDocument();
  });
});
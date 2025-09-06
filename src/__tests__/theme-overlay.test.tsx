import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { ThemeProvider, useTheme } from '../components/providers/ThemeProvider';
import { Modal } from '../components/Modal';

// Helper to wrap components with necessary providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Theme System', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset dark class
    document.documentElement.classList.remove('dark');
  });

  it('should respect system preference on initial load (dark)', () => {
    // Mock matchMedia for prefers-color-scheme
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: (_: 'change', cb: (e: MediaQueryListEvent) => void) => {
        listeners.add(cb);
      },
      removeEventListener: (_: 'change', cb: (e: MediaQueryListEvent) => void) => {
        listeners.delete(cb);
      },
      onchange: null,
      dispatchEvent: () => true,
    }));
    // Assign mock matchMedia for jsdom environment
     
    (window as any).matchMedia = mockMatchMedia;

    const TestComponent = () => {
      const { isDarkMode } = useTheme();
      return <div data-testid="theme">{isDarkMode ? 'dark' : 'light'}</div>;
    };

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should persist theme selection in localStorage and toggle dark class', () => {
    const TestComponent = () => {
      const { setTheme } = useTheme();
      return (
        <>
          <button onClick={() => setTheme(true)}>Dark</button>
          <button onClick={() => setTheme(false)}>Light</button>
        </>
      );
    };

    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByText('Light'));
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('Modal Component - overlay dismissal and focus', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('should dismiss on Escape key', () => {
    const onClose = vi.fn();

    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <button>Button</button>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should dismiss on outside click', () => {
    const onClose = vi.fn();

    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <button>Internal</button>
      </Modal>
    );

    // Mouse down outside (on document)
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not dismiss when clicking inside content', () => {
    const onClose = vi.fn();

    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <button data-testid="inside">Inside</button>
      </Modal>
    );

    fireEvent.mouseDown(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

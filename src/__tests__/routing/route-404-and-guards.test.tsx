import React from 'react';
import { describe, it, beforeEach, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import App, { AppContent } from '../../App';
import { ThemeProvider } from '../../components/providers/ThemeProvider';
import { setCurrentUser, Role } from '../../rbac/roles';

describe('Routing: 404 and guards', () => {
  beforeEach(() => {
    // Ensure logged-out state by default
    setCurrentUser(null);
  });

  it('renders NotFound on unknown routes', async () => {
    (globalThis as any).__TEST_INITIAL_ENTRIES = ['/this-route-does-not-exist'];
    render(
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    );

    await screen.findByRole('heading', { name: /Page (Not Found|Unavailable Offline)/i });
  });

  it('renders protected route when user is logged in', async () => {
    // Simulate authenticated user
    setCurrentUser({ id: 't1', name: 'Test Owner', role: Role.BUSINESS_OWNER });

    (globalThis as any).__TEST_INITIAL_ENTRIES = ['/dashboard'];
    render(
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    );

    // Dashboard title should render
    await screen.findByRole('heading', { name: /Dashboard/i });
  });
});



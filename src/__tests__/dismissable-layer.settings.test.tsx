import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import Settings from '../pages/Settings';

describe('Settings page basic functionality', () => {
  it('renders Settings page without errors', async () => {
    renderWithProviders(<Settings />, { route: '/settings' });

    // Should show Settings page header
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Should show Role Management section (may be blocked based on permissions)
    expect(screen.getByText(/Role Management/i)).toBeInTheDocument();
  });
});

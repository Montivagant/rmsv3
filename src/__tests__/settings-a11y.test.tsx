import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import Settings from '../pages/Settings';

describe('Settings (/settings) a11y and interactions', () => {
  it('Settings page renders with no obvious accessibility violations', async () => {
    const { container } = renderWithProviders(<Settings />, { route: '/settings' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows blocked message for users without proper permissions', async () => {
    const { container } = renderWithProviders(<Settings />, { route: '/settings' });

    // Should show blocked message for role management section
    expect(screen.getByText(/This section requires Role Management role/)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

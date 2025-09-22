import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import AdminConsole from '../settings/AdminConsole';

describe('Settings (/settings) a11y and interactions', () => {
  it('AdminConsole renders with no obvious accessibility violations', async () => {
    const { container } = renderWithProviders(<AdminConsole />, { route: '/settings' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows Sticky Save bar when settings become dirty and hides after Save', async () => {
    const { container } = renderWithProviders(<AdminConsole />, { route: '/settings' });

    // Initially, no sticky bar
    expect(screen.queryByText(/You have unsaved changes/i)).toBeNull();

    // Toggle a user flag to make the form dirty
    const kdsToggle = await screen.findByLabelText(/kds module/i);
    fireEvent.click(kdsToggle);

    // Sticky bar visible
    expect(await screen.findByText(/You have unsaved changes/i)).toBeInTheDocument();

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    // After save, sticky bar should hide
    // Give a short tick for state to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText(/You have unsaved changes/i)).toBeNull();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

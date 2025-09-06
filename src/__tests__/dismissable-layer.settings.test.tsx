import { describe, it, expect } from 'vitest';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import AdminConsole from '../settings/AdminConsole';

describe('useDismissableLayer integration in Settings', () => {
  it('DangerAction dialog closes on Escape', async () => {
    renderWithProviders(<AdminConsole />, { route: '/settings' });

    // Open the "Reset UI preferences" confirm dialog
    const btn = await screen.findByRole('button', { name: /reset ui preferences/i });
    fireEvent.click(btn);

    // Dialog should be present
    const dialogTitle = await screen.findByText(/confirm action/i);
    expect(dialogTitle).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    // Dialog should close
    expect(screen.queryByText(/confirm action/i)).toBeNull();
  });
});

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

import { Drawer } from '../components/Drawer';

// Helper to render with Router for popstate tests
const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

function DrawerHarness({
  defaultOpen = true,
  side = 'right' as const,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button aria-label="open-drawer" onClick={() => setOpen(true)}>
        Open Drawer
      </button>
      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Test Drawer"
        description="Drawer for testing"
        side={side}
        closeOnEscape={closeOnEscape}
        closeOnOverlayClick={closeOnOverlayClick}
      >
        <button>Inside Action</button>
      </Drawer>
    </div>
  );
}

describe('Drawer - dismissal and accessibility', () => {
  it('renders with role=dialog and title', () => {
    render(<DrawerHarness defaultOpen />);
    const dialog = screen.getByRole('dialog', { name: /test drawer/i });
    expect(dialog).toBeInTheDocument();
  });

  it('dismisses on Escape key (when enabled)', async () => {
    render(<DrawerHarness defaultOpen closeOnEscape />);
    expect(screen.getByRole('dialog', { name: /test drawer/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /test drawer/i })).not.toBeInTheDocument();
    });
  });

  it('does not dismiss on inside click but dismisses on outside click', async () => {
    render(<DrawerHarness defaultOpen />);
    const dialog = screen.getByRole('dialog', { name: /test drawer/i });
    expect(dialog).toBeInTheDocument();

    // Click inside the drawer - should not close (Drawer stops propagation)
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog', { name: /test drawer/i })).toBeInTheDocument();

    // Click outside (on body) - unified layer should dismiss
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /test drawer/i })).not.toBeInTheDocument();
    });
  });

  it('dismisses on route change (popstate)', async () => {
    renderWithRouter(<DrawerHarness defaultOpen />);
    expect(screen.getByRole('dialog', { name: /test drawer/i })).toBeInTheDocument();

    // Simulate route change
    window.history.pushState({}, '', '/other');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /test drawer/i })).not.toBeInTheDocument();
    });
  });
});

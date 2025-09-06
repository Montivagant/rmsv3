import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

import { DropdownMenu, DropdownMenuItem } from '../components/DropdownMenu';
import { Modal } from '../components/Modal';

// Helper to render with Router (for popstate tests)
const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

function MenuUnderTest({ withSecondOverlay = false }: { withSecondOverlay?: boolean }) {
  const [openModal, setOpenModal] = React.useState(false);

  return (
    <div>
      <DropdownMenu
        trigger={<button aria-label="open-menu">Open Menu</button>}
      >
        <DropdownMenuItem onClick={() => {}}>Item A</DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}}>Item B</DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}}>Item C</DropdownMenuItem>
      </DropdownMenu>

      {withSecondOverlay && (
        <button aria-label="open-modal" onClick={() => setOpenModal(true)}>
          Open Modal
        </button>
      )}

      <Modal isOpen={openModal} onClose={() => setOpenModal(false)} title="Second Overlay">
        <button>Close</button>
      </Modal>
    </div>
  );
}

describe('DropdownMenu - accessibility and dismissal', () => {
  beforeEach(() => {
    // Ensure clean DOM state
    document.body.innerHTML = '';
  });

  it('opens on trigger click and renders menu items with correct roles', () => {
    renderWithRouter(<MenuUnderTest />);

    // Open
    fireEvent.click(screen.getByRole('button', { name: /open-menu/i }));
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Item A');
    expect(items[1]).toHaveTextContent('Item B');
    expect(items[2]).toHaveTextContent('Item C');
  });

  it('focuses the first item on open and supports Arrow/Home/End navigation', () => {
    renderWithRouter(<MenuUnderTest />);

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /open-menu/i }));
    const items = screen.getAllByRole('menuitem');

    // First item should gain focus
    expect(items[0]).toHaveFocus();

    // ArrowDown -> next item
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();

    // End -> last item
    fireEvent.keyDown(document, { key: 'End' });
    expect(items[2]).toHaveFocus();

    // Home -> first item
    fireEvent.keyDown(document, { key: 'Home' });
    expect(items[0]).toHaveFocus();

    // ArrowUp from first -> last (wrap)
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(items[2]).toHaveFocus();
  });

  it('dismisses on Escape press', () => {
    renderWithRouter(<MenuUnderTest />);

    fireEvent.click(screen.getByRole('button', { name: /open-menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    // Menu should be removed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('dismisses on outside click', () => {
    renderWithRouter(<MenuUnderTest />);

    fireEvent.click(screen.getByRole('button', { name: /open-menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Outside click (body)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('dismisses on route change (popstate)', async () => {
    renderWithRouter(<MenuUnderTest />);

    fireEvent.click(screen.getByRole('button', { name: /open-menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Simulate route change
    window.history.pushState({}, '', '/new-route');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('one overlay at a time: opening a modal closes the dropdown menu', async () => {
    renderWithRouter(<MenuUnderTest withSecondOverlay />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /open-menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Now open modal (second overlay)
    fireEvent.click(screen.getByRole('button', { name: /open-modal/i }));

    // Dropdown menu should close
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    // Modal is present
    expect(screen.getByRole('dialog', { name: /second overlay/i })).toBeInTheDocument();
  });
});

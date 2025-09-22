import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';

function renderNav() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar userRole="admin" onNewAction={() => {}} />
    </MemoryRouter>
  );
}

describe('AppNav Quick Actions overlay', () => {
  it('opens and closes on outside click, Escape, and route change', async () => {
    const user = userEvent.setup();
    renderNav();

    // Open via "+ New" trigger
    const trigger = await screen.findByRole('button', { name: /new/i });
    await user.click(trigger);

    // Menu should appear
    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();

    // Close via outside click
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Reopen
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Close via Escape
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Reopen
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Close on route change (popstate)
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

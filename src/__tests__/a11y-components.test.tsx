import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';

import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../components/DropdownMenu';
import { Drawer } from '../components/Drawer';
import { NavigationBreadcrumb } from '../components/navigation/NavigationBreadcrumb';

// Helper to open DropdownMenu (click trigger)
function renderDropdown(triggerLabel = 'Open menu') {
  const { container, getByText } = render(
    <div>
      <DropdownMenu
        trigger={
          <button aria-haspopup="menu" aria-controls="menu">
            {triggerLabel}
          </button>
        }
      >
        <DropdownMenuItem onClick={() => {}}>First</DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}}>Second</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {}} destructive>
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
  fireEvent.click(getByText(triggerLabel));
  return { container };
}

describe('A11y checks (axe) on core UI components', () => {
  it('DropdownMenu has no obvious accessibility violations when open', async () => {
    const { container } = renderDropdown();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Drawer open state has no obvious accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Drawer isOpen={true} onClose={() => {}} title="Settings">
          <div className="space-y-2">
            <label htmlFor="name" className="field-label">Name</label>
            <input id="name" className="input-base" placeholder="Your name" />
            <button className="btn-primary">Save</button>
          </div>
        </Drawer>
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('NavigationBreadcrumb has no obvious accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <NavigationBreadcrumb />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

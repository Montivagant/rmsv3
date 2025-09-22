import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';

import { TopBar } from '../components/navigation/TopBar';
import { Sidebar } from '../components/navigation/Sidebar';
import { Modal } from '../components/Modal';

describe('A11y smoke tests (axe)', () => {
  it('TopBar has no obvious accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <TopBar
          userName="Tester"
          userRole="Admin"
          notifications={2}
          onSearch={() => {}}
          onThemeToggle={() => {}}
          onProfileAction={() => {}}
          isDarkMode={true}
        />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Sidebar (side navigation) has no obvious accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/inventory']}>
        <Sidebar userRole="admin" onNewAction={() => {}} />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Modal open state has no obvious accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="A11y Test Dialog"
          description="Dialog used to verify accessibility checks."
        >
          <div className="space-y-2">
            <p>Dialog content</p>
            <button className="btn-primary">Primary</button>
          </div>
        </Modal>
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

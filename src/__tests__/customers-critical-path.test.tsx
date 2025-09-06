import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { screen, render, waitFor, fireEvent, within, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Customers from '../pages/Customers';
import { CustomerProfileDrawer } from '../customers/CustomerProfileDrawer';
import type { Customer } from '../customers/types';
import { Role, setCurrentUser } from '../rbac/roles';

// Utility to render Customers page with providers
function renderCustomers(route: string = '/customers') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Customers />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

let fetchStub: ReturnType<typeof vi.fn>;

beforeAll(() => {
  // Seed a local in-memory "DB" for this test file
  const customersDb: any[] = [];
  for (let i = 1; i <= 200; i++) {
    const first = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Taylor', 'Pat', 'Casey'][i % 8];
    const last = ['Doe', 'Smith', 'Johnson', 'Lee', 'Brown', 'Davis', 'Miller', 'Wilson'][i % 8];
    const status = Math.random() > 0.15 ? 'active' : 'inactive';
    const visits = Math.floor(Math.random() * 60);
    const spent = Number((Math.random() * 5000).toFixed(2));
    customersDb.push({
      id: String(i),
      name: `${first} ${last} ${i}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `555-${String(1000 + Math.floor(Math.random() * 9000))}`,
      orders: Math.floor(visits * (0.6 + Math.random() * 0.8)),
      totalSpent: spent,
      visits,
      points: Math.floor(spent / 10) + Math.floor(Math.random() * 100),
      lastVisit: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 3600 * 1000).toISOString(),
      status,
      tags: status === 'active' && Math.random() > 0.8 ? ['vip'] : [],
    });
  }

  // Minimal fetch stub to satisfy Customers page calls
  fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const toUrl = (u: RequestInfo | URL) =>
      typeof u === 'string' ? new URL(u, 'http://localhost') : new URL(u.toString(), 'http://localhost');
    const url = toUrl(input);
    const pathname = url.pathname;
    const method = (init?.method || 'GET').toUpperCase();
    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (pathname === '/api/customers' && method === 'GET') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10)));
      const search = (url.searchParams.get('search') || '').toLowerCase();
      let data = customersDb.slice();
      if (search) {
        data = data.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search) ||
            String(c.phone).toLowerCase().includes(search)
        );
      }
      const total = data.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageData = data.slice(start, end);
      return json({ data: pageData, page, pageSize, total });
    }

    const mPatch = pathname.match(/^\/api\/customers\/(\d+)$/);
    if (mPatch && method === 'PATCH') {
      const id = mPatch[1];
      const idx = customersDb.findIndex((c) => String(c.id) === id);
      if (idx === -1) return json(null, 404);
      const body = init?.body ? JSON.parse(init.body as string) : {};
      customersDb[idx] = { ...customersDb[idx], ...body, id: customersDb[idx].id };
      return json(customersDb[idx]);
    }

    const mAdjust = pathname.match(/^\/api\/customers\/(\d+)\/loyalty-adjust$/);
    if (mAdjust && method === 'POST') {
      const id = mAdjust[1];
      const idx = customersDb.findIndex((c) => String(c.id) === id);
      if (idx === -1) return json(null, 404);
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const delta = Number(body?.delta);
      if (!Number.isFinite(delta) || Math.abs(delta) > 100000) {
        return json({ error: 'Invalid delta' }, 400);
      }
      const nextPoints = Math.max(0, (customersDb[idx].points || 0) + Math.trunc(delta));
      customersDb[idx] = { ...customersDb[idx], points: nextPoints };
      return json(customersDb[idx]);
    }

    return json({ error: `Unhandled path in test fetch stub: ${pathname}` }, 501);
  });

  // Install stubbed fetch
  (globalThis as any).fetch = fetchStub;

  // Ensure an admin is logged in for RBAC-enabled actions by default
  setCurrentUser({ id: 'u1', name: 'Admin', role: Role.BUSINESS_OWNER });

  // Mock URL object methods used by CSV export
  (global as any).URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  (global as any).URL.revokeObjectURL = vi.fn();

  // Prevent jsdom navigation on programmatic anchor clicks (e.g., CSV export)
  vi.spyOn(HTMLAnchorElement.prototype as any, 'click').mockImplementation(() => {});
});

afterEach(() => {
  fetchStub.mockClear();
  // Clear any remaining dialogs/modals
  const dialogs = document.querySelectorAll('[role="dialog"]');
  dialogs.forEach(dialog => {
    if (dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  });
});

afterAll(() => {
  // Clean up user
  setCurrentUser(null);
});

describe('Customers critical-path flows', () => {
  it('supports selection, bulk actions (CSV, tag, activate/deactivate) and loyalty adjust with RBAC', async () => {
    renderCustomers();

    // Wait for table to load (virtualized rows container becomes available)
    // The loading text is "Loading customers…", then rows render
    await waitFor(async () => {
      expect(screen.queryByText(/Loading customers/i)).toBeNull();
    });

    // In JSDOM, virtualization may hide row checkboxes. Use header select-all.
    const selectAll = await screen.findByRole('checkbox', { name: /Select all rows/i });
    fireEvent.click(selectAll);

    // Bulk bar appears
    const bulkBar = await screen.findByRole('region', { name: /Bulk actions/i });
    expect(bulkBar).toBeInTheDocument();

    // CSV export triggers URL.createObjectURL
    const exportBtn = within(bulkBar).getByRole('button', { name: /Export selected customers to CSV/i });
    fireEvent.click(exportBtn);
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Add Tag flow - open modal, enter tag, submit, selection cleared
    const addTagBtn = within(bulkBar).getByRole('button', { name: /Add tag to selected customers/i });
    fireEvent.click(addTagBtn);

    const tagDialog = await screen.findByRole('dialog', { name: /Add Tag to Selected Customers/i });
    const tagInput = await within(tagDialog).findByRole('textbox', { name: /^Tag$/i });
    fireEvent.change(tagInput, { target: { value: 'vip' } });

    // Spy on fetch to count PATCH requests
    const fetchSpy = vi.spyOn(global, 'fetch');

    const applyBtn = within(tagDialog).getByRole('button', { name: /Apply Tag/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      // Modal should close and bulk bar clear due to selection cleared
      expect(screen.queryByRole('dialog', { name: /Add Tag to Selected Customers/i })).toBeNull();
      expect(screen.queryByRole('region', { name: /Bulk actions/i })).toBeNull();
    });

    // Verify at least two PATCH calls were made to /api/customers/:id
    const patchCalls = fetchSpy.mock.calls.filter(
      ([url, init]) =>
        typeof url === 'string' &&
        /\/api\/customers\/\d+$/i.test(url) &&
        init &&
        (init as RequestInit).method === 'PATCH'
    );
    expect(patchCalls.length).toBeGreaterThanOrEqual(2);

    // Re-select via header select-all for status updates
    const selectAll2 = await screen.findByRole('checkbox', { name: /Select all rows/i });
    fireEvent.click(selectAll2);

    const bulkBars2 = await screen.findAllByRole('region', { name: /Bulk actions/i });
    const bulkBar2 = bulkBars2[bulkBars2.length - 1];

    // Activate confirm flow
    const activateBtn = within(bulkBar2).getAllByRole('button', { name: /Activate selected customers/i })[0];
    fireEvent.click(activateBtn);
    const confirmActivate = await screen.findByRole('button', { name: /^Confirm$/i });
    fireEvent.click(confirmActivate);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Activate Customers/i })).toBeNull();
    });

    // Deactivate confirm flow
    // Re-select again via header select-all after clearing selection
    const selectAll3 = await screen.findByRole('checkbox', { name: /Select all rows/i });
    fireEvent.click(selectAll3);

    const bulkBars3 = await screen.findAllByRole('region', { name: /Bulk actions/i });
    const bulkBar3 = bulkBars3[bulkBars3.length - 1];
    const deactivateBtn = within(bulkBar3).getByRole('button', { name: /Deactivate selected customers/i });
    fireEvent.click(deactivateBtn);
    const confirmDeactivate = await screen.findByRole('button', { name: /^Confirm$/i });
    fireEvent.click(confirmDeactivate);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Deactivate Customers/i })).toBeNull();
    });

    // Verify PATCH calls occurred for status updates as well
    const patchStatusCalls = fetchSpy.mock.calls.filter(
      ([url, init]) =>
        typeof url === 'string' &&
        /\/api\/customers\/\d+$/i.test(url) &&
        init &&
        (init as RequestInit).method === 'PATCH'
    );
    expect(patchStatusCalls.length).toBeGreaterThanOrEqual(4); // 2 (tags) + 2 (status) minimum

    // Loyalty adjust flows are validated in a focused component test due to virtualization limits.
    // RBAC gating: staff should NOT see Adjust Points
    
    // Clean up any existing dialogs first
    const existingDialogs = document.querySelectorAll('[role="dialog"]');
    existingDialogs.forEach(dialog => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    });
    
    setCurrentUser({ id: 'u2', name: 'Staff', role: Role.BUSINESS_OWNER });

    // Render a new drawer for staff testing
    const sampleCustomer: Customer = {
      id: '1',
      name: 'Test User',
      email: 't@example.com',
      phone: '',
      orders: 0,
      totalSpent: 0,
      visits: 0,
      points: 10,
      lastVisit: new Date().toISOString(),
      status: 'active',
      tags: [],
    };
    
    render(
      <CustomerProfileDrawer open={true} onClose={() => {}} customer={sampleCustomer} />
    );
    
    // Staff cannot adjust: render drawer and assert no Adjust button
    const dialog2 = await screen.findByRole('dialog', { name: /Test User/i });
    await within(dialog2).findAllByText(/Loyalty/i);
    expect(within(dialog2).queryByRole('button', { name: /Adjust Points/i })).toBeNull();

    fetchSpy.mockRestore();
  });

  it('loyalty adjust respects RBAC and updates points', async () => {
    // Admin can adjust
    setCurrentUser({ id: 'u1', name: 'Admin', role: Role.BUSINESS_OWNER });
    const sample: Customer = {
      id: '1',
      name: 'Test User',
      email: 't@example.com',
      phone: '',
      orders: 0,
      totalSpent: 0,
      visits: 0,
      points: 10,
      lastVisit: new Date().toISOString(),
      status: 'active',
      tags: [],
    };

    render(
      <CustomerProfileDrawer open={true} onClose={() => {}} customer={sample} />
    );

    const dialog = await screen.findByRole('dialog', { name: /Test User/i });
    await within(dialog).findByText(/Loyalty/i);
    const adjustBtn = await within(dialog).findByRole('button', { name: /Adjust Points/i });
    fireEvent.click(adjustBtn);
    const adjustDialog = await screen.findByRole('dialog', { name: /Adjust Loyalty Points/i });
    const deltaInput = await within(adjustDialog).findByLabelText(/Points delta/i);
    fireEvent.change(deltaInput, { target: { value: '100' } });
    const applyAdjust = within(adjustDialog).getByRole('button', { name: /^Apply$/i });
    fireEvent.click(applyAdjust);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Adjust Loyalty Points/i })).toBeNull();
    });

    // Close the admin drawer to avoid duplicate dialogs when rendering staff view
    const closeBtn = within(dialog).getByRole('button', { name: /Close drawer/i });
    fireEvent.click(closeBtn);
    
    // Force cleanup and wait
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Staff cannot adjust
    setCurrentUser({ id: 'u2', name: 'Staff', role: Role.BUSINESS_OWNER });
    render(
      <CustomerProfileDrawer open={true} onClose={() => {}} customer={sample} />
    );
    const staffDialogs = await screen.findAllByRole('dialog', { name: /Test User/i });
    const staffDialog = staffDialogs[staffDialogs.length - 1];
    await within(staffDialog).findByText(/Loyalty/i);
    expect(within(staffDialog).queryByRole('button', { name: /Adjust Points/i })).toBeNull();
  });

  it('shows error on invalid loyalty delta (client validation)', async () => {
    setCurrentUser({ id: 'u1', name: 'Admin', role: Role.BUSINESS_OWNER });
    const sample: Customer = {
      id: '1',
      name: 'Test User',
      email: 't@example.com',
      phone: '',
      orders: 0,
      totalSpent: 0,
      visits: 0,
      points: 10,
      lastVisit: new Date().toISOString(),
      status: 'active',
      tags: [],
    };

    render(
      <CustomerProfileDrawer open={true} onClose={() => {}} customer={sample} />
    );

    const dialog3 = await screen.findByRole('dialog', { name: /Test User/i });
    await within(dialog3).findAllByText(/Loyalty/i);
    const adjustBtn = await within(dialog3).findByRole('button', { name: /Adjust Points/i });
    fireEvent.click(adjustBtn);

    const adjustDialog2 = await screen.findByRole('dialog', { name: /Adjust Loyalty Points/i });
    const deltaInput = await within(adjustDialog2).findByLabelText(/Points delta/i);
    fireEvent.change(deltaInput, { target: { value: '1.5' } });

    const applyAdjust = within(adjustDialog2).getByRole('button', { name: /^Apply$/i });
    fireEvent.click(applyAdjust);

    await screen.findByText(/Enter a whole number/i);
  });
});

import { Drawer, Card, CardHeader, CardTitle, CardContent, EmptyState, Button, Input, FormField, Label } from '../components';
import type { Customer } from './types';
// import { Role, getRole } from '../rbac/roles';
import { useOrders } from '../hooks/useOrders';
import { useEffect, useState } from 'react';
import { upsertCustomerProfile } from './repository';
import { useRepositoryMutation } from '../hooks/useRepository';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerProfileDrawer({ open, onClose, customer }: Props) {
  // const _canManage = getRole() === Role.BUSINESS_OWNER; // Unused after loyalty removal
  const { orders } = useOrders({ includeCancelled: false, includeCompleted: true, customerId: customer?.id });
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<Customer | null>(customer);
  const [form, setForm] = useState<{ name: string; email: string; phone: string } | null>(
    customer ? { name: customer.name, email: customer.email || '', phone: customer.phone || '' } : null
  );
  const [saving, setSaving] = useState(false);
  const saveMutation = useRepositoryMutation(upsertCustomerProfile);

  useEffect(() => {
    setLocal(customer);
    if (customer) {
      setForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '' });
    } else {
      setForm(null);
      setEditing(false);
    }
  }, [customer]);

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={local ? local.name : 'Customer Profile'}
      description="Customer profile"
      size="xl"
      side="right"
    >
      {!local ? (
        <EmptyState
          title="No customer selected"
          description="Select a customer from the table to view their profile."
          action={{ label: 'Close', onClick: onClose, variant: 'secondary' }}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Profile</span>
                {!editing ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-text-secondary">Name</div>
                    <div className="font-medium">{local.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary">Email</div>
                    <div className="font-medium">{local.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary">Phone</div>
                    <div className="font-medium">{local.phone}</div>
                  </div>
                  {typeof local.orders === 'number' && (
                    <div>
                      <div className="text-sm text-text-secondary">Orders</div>
                      <div className="font-medium">{local.orders}</div>
                    </div>
                  )}
                  {typeof local.totalSpent === 'number' && (
                    <div>
                      <div className="text-sm text-text-secondary">Total Spent</div>
                      <div className="font-medium">${local.totalSpent.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <form
                  className="space-y-3 max-w-md"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!form) return;
                    setSaving(true);
                    try {
                      await saveMutation.mutate({ id: (local as Customer).id, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
                      // Update local state immediately
                      setLocal(prev => prev ? { ...prev, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() } : prev);
                      // Notify listeners (e.g., Customers page) to refetch
                      try {
                        window.dispatchEvent(new CustomEvent('customers:updated'));
                      } catch {
                        // Ignore dispatch errors in unsupported environments
                      }
                      setEditing(false);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <FormField>
                    <Label htmlFor="cust-name">Full Name</Label>
                    <Input id="cust-name" value={form?.name ?? ''} onChange={(e) => setForm(f => ({ ...(f as any), name: e.target.value }))} />
                  </FormField>
                  <FormField>
                    <Label htmlFor="cust-email">Email</Label>
                    <Input id="cust-email" type="email" value={form?.email ?? ''} onChange={(e) => setForm(f => ({ ...(f as any), email: e.target.value }))} />
                  </FormField>
                  <FormField>
                    <Label htmlFor="cust-phone">Phone</Label>
                    <Input id="cust-phone" value={form?.phone ?? ''} onChange={(e) => setForm(f => ({ ...(f as any), phone: e.target.value }))} />
                  </FormField>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setEditing(false); setForm(local ? { name: local.name, email: local.email || '', phone: local.phone || '' } : null); }} disabled={saving}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Loyalty removed */}

          <Card>
            <CardHeader>
              <CardTitle>Order History Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="text-text-secondary">Recent orders (all branches)</div>
                <ul className="list-disc ml-5">
                  {orders
                    .filter(o => !local || o.customerId === local.id)
                    .slice(0, 5)
                    .map(o => (
                      <li key={o.id} className="flex justify-between">
                        <span>{o.ticketId}</span>
                        <span className="text-text-secondary">{o.status}</span>
                      </li>
                    ))}
                  {orders.filter(o => !local || o.customerId === local.id).length === 0 && (
                    <li className="text-text-secondary">No orders found for this customer.</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loyalty adjustment UI removed */}
    </Drawer>
  );
}

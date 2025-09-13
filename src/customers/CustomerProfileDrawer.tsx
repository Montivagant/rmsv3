import React, { useEffect, useState } from 'react';
import { Drawer, Button, Card, CardHeader, CardTitle, CardContent, EmptyState, Modal, FormField, Label, Input, Textarea } from '../components';
import type { Customer } from './types';
import { apiPost } from '../hooks/useApi';
import { Role, getRole, hasPermission } from '../rbac/roles';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerProfileDrawer({ open, onClose, customer }: Props) {
  const canAdjust = hasPermission(getRole(), Role.BUSINESS_OWNER);

  // Local points state to reflect adjustments immediately
  const [currentPoints, setCurrentPoints] = useState<number>(customer?.points ?? 0);
  useEffect(() => {
    setCurrentPoints(customer?.points ?? 0);
  }, [customer]);

  // Adjust points modal state
  const [showAdjust, setShowAdjust] = useState(false);
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetAdjustForm = () => {
    setDelta('');
    setReason('');
    setSubmitError(null);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const parsed = Number(delta);
    if (!Number.isFinite(parsed) || Math.trunc(parsed) !== parsed || Math.abs(parsed) > 100000) {
      setSubmitError('Enter a whole number between -100000 and 100000.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await apiPost<{ points: number }>(`/api/customers/${customer.id}/loyalty-adjust`, {
        delta: parsed,
        reason: reason?.trim() || undefined,
      });
      if (typeof (updated as any).points === 'number') {
        setCurrentPoints((updated as any).points);
      }
      setShowAdjust(false);
      resetAdjustForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={customer ? customer.name : 'Customer Profile'}
      description="Customer profile"
      size="xl"
      side="right"
    >
      {!customer ? (
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
                <span>Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-text-secondary">Email</div>
                  <div className="font-medium">{customer.email}</div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary">Phone</div>
                  <div className="font-medium">{customer.phone}</div>
                </div>
                {typeof customer.orders === 'number' && (
                  <div>
                    <div className="text-sm text-text-secondary">Orders</div>
                    <div className="font-medium">{customer.orders}</div>
                  </div>
                )}
                {typeof customer.totalSpent === 'number' && (
                  <div>
                    <div className="text-sm text-text-secondary">Total Spent</div>
                    <div className="font-medium">${customer.totalSpent.toFixed(2)}</div>
                  </div>
                )}
              </div>
              {/* Tags removed in simplified model */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loyalty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-secondary">Current Points</div>
                <div className="font-semibold">{currentPoints} pts</div>
              </div>
              {/* Adjustment UI intentionally in profile drawer only (no in-list editing) */}
              <div className="flex gap-2">
                {canAdjust ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowAdjust(true)}
                  >
                    Adjust Points
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order History Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-text-secondary">
                This is a snapshot. Hook to real orders endpoint in a follow-up.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjust Points Modal */}
      <Modal
        isOpen={showAdjust}
        onClose={() => {
          if (!submitting) {
            setShowAdjust(false);
            resetAdjustForm();
          }
        }}
        title="Adjust Loyalty Points"
        description="Increase or decrease points for this customer. This action is audited."
      >
        <form onSubmit={handleAdjust} className="space-y-form">
          <FormField error={submitError || undefined} required>
            <Label htmlFor="points-delta" required>
              Points delta
            </Label>
            <Input
              id="points-delta"
              type="number"
              inputMode="numeric"
              step="1"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g., 100 or -50"
            />
          </FormField>

          <FormField>
            <Label htmlFor="points-reason">Reason (optional)</Label>
            <Textarea
              id="points-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer service goodwill, manual correction, promotion"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAdjust(false);
                resetAdjustForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !delta.trim()}>
              {submitting ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        </form>
      </Modal>
    </Drawer>
  );
}

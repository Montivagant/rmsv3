import React, { useState } from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';
import { saveReturnSettings, getReturnSettings, type ReturnStage } from '../../settings/returns';
import { getKdsSettings, saveKdsSettings } from '../../settings/kds';

export default function SystemSettings() {
  const initial = getReturnSettings();
  const [requirePin, setRequirePin] = useState<boolean>(initial.requirePin);
  const [pin, setPin] = useState<string>(initial.pin);
  const [stage, setStage] = useState<ReturnStage>(initial.stage);
  const kdsInitial = getKdsSettings();
  const [kdsWarning, setKdsWarning] = useState<number>(kdsInitial.warningThresholdMinutes);
  const [kdsDanger, setKdsDanger] = useState<number>(kdsInitial.dangerThresholdMinutes);
  const [kdsRefresh, setKdsRefresh] = useState<number>(kdsInitial.autoRefreshSeconds);
  const [kdsPulse, setKdsPulse] = useState<boolean>(kdsInitial.showPulse);
  const [kdsOnlyActive, setKdsOnlyActive] = useState<boolean>(kdsInitial.showOnlyActive);

  function handleSave() {
    saveReturnSettings({ requirePin, pin: pin.trim(), stage });
    saveKdsSettings({
      warningThresholdMinutes: Math.max(0, Number(kdsWarning) || 0),
      dangerThresholdMinutes: Math.max(1, Number(kdsDanger) || 1),
      autoRefreshSeconds: Math.max(5, Number(kdsRefresh) || 30),
      showPulse: kdsPulse,
      showOnlyActive: kdsOnlyActive,
    });
    alert('Settings saved');
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="System Settings"
        description="Configure system-level preferences and integrations"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8 space-y-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            }
            title="System Configuration"
            description="Manage database connections, API integrations, and system preferences."
            action={{
              label: "Configure System",
              onClick: () => console.log("Configure system clicked"),
              variant: "primary"
            }}
          />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Returns Settings</h2>
            <div className="flex items-center gap-3">
              <input
                id="require-pin"
                type="checkbox"
                checked={requirePin}
                onChange={(e) => setRequirePin(e.currentTarget.checked)}
              />
              <label htmlFor="require-pin">Require PIN to return an item/order</label>
            </div>
            <div className="max-w-xs">
              <label htmlFor="return-pin" className="block text-sm mb-1">Return PIN Code</label>
              <input
                id="return-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Set PIN used for returns"
                className="border rounded px-3 py-2 w-full bg-background"
              />
            </div>
            <div className="max-w-xs">
              <label htmlFor="return-stage" className="block text-sm mb-1">Allowed Return Stage</label>
              <select
                id="return-stage"
                value={stage}
                onChange={(e) => setStage(e.currentTarget.value as ReturnStage)}
                className="border rounded px-3 py-2 w-full bg-background"
              >
                <option value="before_payment">Before payment (void)</option>
                <option value="same_day">Same day only</option>
                <option value="anytime_with_approval">Anytime (with approval)</option>
              </select>
            </div>
            <div>
              <button onClick={handleSave} className="px-4 py-2 rounded bg-primary text-primary-foreground">Save</button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">KDS Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label htmlFor="kds-warning" className="block text-sm mb-1">Warning threshold (minutes)</label>
                <input
                  id="kds-warning"
                  type="number"
                  min={0}
                  value={kdsWarning}
                  onChange={(e) => setKdsWarning(Number(e.target.value))}
                  className="border rounded px-3 py-2 w-full bg-background"
                />
              </div>
              <div>
                <label htmlFor="kds-danger" className="block text-sm mb-1">Overdue threshold (minutes)</label>
                <input
                  id="kds-danger"
                  type="number"
                  min={1}
                  value={kdsDanger}
                  onChange={(e) => setKdsDanger(Number(e.target.value))}
                  className="border rounded px-3 py-2 w-full bg-background"
                />
              </div>
              <div>
                <label htmlFor="kds-refresh" className="block text-sm mb-1">Auto refresh (seconds)</label>
                <input
                  id="kds-refresh"
                  type="number"
                  min={5}
                  value={kdsRefresh}
                  onChange={(e) => setKdsRefresh(Number(e.target.value))}
                  className="border rounded px-3 py-2 w-full bg-background"
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input id="kds-pulse" type="checkbox" checked={kdsPulse} onChange={(e) => setKdsPulse(e.currentTarget.checked)} />
                <label htmlFor="kds-pulse">Pulse overdue timers</label>
              </div>
              <div className="flex items-center gap-3">
                <input id="kds-only-active" type="checkbox" checked={kdsOnlyActive} onChange={(e) => setKdsOnlyActive(e.currentTarget.checked)} />
                <label htmlFor="kds-only-active">Show only active (hide served)</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
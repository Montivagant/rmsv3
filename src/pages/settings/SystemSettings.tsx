import { useState } from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import { saveReturnSettings, getReturnSettings, type ReturnStage } from '../../settings/returns';
import { getKdsSettings, saveKdsSettings } from '../../settings/kds';

export default function SystemSettings() {
  const { showSuccess, showError } = useNotifications();
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
    try {
      saveReturnSettings({ requirePin, pin: pin.trim(), stage });
      saveKdsSettings({
        warningThresholdMinutes: Math.max(0, Number(kdsWarning) || 0),
        dangerThresholdMinutes: Math.max(1, Number(kdsDanger) || 1),
        autoRefreshSeconds: Math.max(5, Number(kdsRefresh) || 30),
        showPulse: kdsPulse,
        showOnlyActive: kdsOnlyActive,
      });
      showSuccess('System Settings', 'Settings saved successfully');
    } catch (error) {
      showError('System Settings', 'Failed to save settings');
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="System Settings"
        description="Configure system-level preferences and integrations"
      />
      
      <div className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Returns Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                placeholder="Enter PIN code"
                className="border border-border rounded-md px-3 py-2 w-full bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="max-w-xs">
              <label htmlFor="return-stage" className="block text-sm mb-1">Allowed Return Stage</label>
              <select
                id="return-stage"
                value={stage}
                onChange={(e) => setStage(e.currentTarget.value as ReturnStage)}
                className="border border-border rounded-md px-3 py-2 w-full bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="before_payment">Before payment (void)</option>
                <option value="same_day">Same day only</option>
                <option value="anytime_with_approval">Anytime (with approval)</option>
              </select>
            </div>
            <div>
              <Button onClick={handleSave}>Save Settings</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KDS Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label htmlFor="kds-warning" className="block text-sm font-medium mb-1">Warning threshold (minutes)</label>
                <input
                  id="kds-warning"
                  type="number"
                  min={0}
                  value={kdsWarning}
                  onChange={(e) => setKdsWarning(Number(e.target.value))}
                  className="border border-border rounded-md px-3 py-2 w-full bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="kds-danger" className="block text-sm font-medium mb-1">Overdue threshold (minutes)</label>
                <input
                  id="kds-danger"
                  type="number"
                  min={1}
                  value={kdsDanger}
                  onChange={(e) => setKdsDanger(Number(e.target.value))}
                  className="border border-border rounded-md px-3 py-2 w-full bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="kds-refresh" className="block text-sm font-medium mb-1">Auto refresh (seconds)</label>
                <input
                  id="kds-refresh"
                  type="number"
                  min={5}
                  value={kdsRefresh}
                  onChange={(e) => setKdsRefresh(Number(e.target.value))}
                  className="border border-border rounded-md px-3 py-2 w-full bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input
                  id="kds-pulse"
                  type="checkbox"
                  checked={kdsPulse}
                  onChange={(e) => setKdsPulse(e.currentTarget.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="kds-pulse" className="text-sm font-medium">Pulse overdue timers</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="kds-only-active"
                  type="checkbox"
                  checked={kdsOnlyActive}
                  onChange={(e) => setKdsOnlyActive(e.currentTarget.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="kds-only-active" className="text-sm font-medium">Show only active (hide served)</label>
              </div>
            </div>
            <Button onClick={handleSave} className="mt-4">Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useFlags } from '../store/flags';
import type { Flags } from '../lib/flags';
import { useUI, type Density, type DateFormat, type NumberFormat } from '../store/ui';
import { getOversellPolicy, setOversellPolicy } from '../inventory/policy';
import type { OversellPolicy } from '../inventory/types';
import { auditLogger } from '../rbac/audit';
import { useToast } from '../components/Toast';

import SettingSection from './ui/SettingSection';
import SettingCard from './ui/SettingCard';
import SettingRow from './ui/SettingRow';
import Toggle from './ui/Toggle';
import { Select } from '../components/Select';
import Description from './ui/Description';
import HelpLink from './ui/HelpLink';
import StickyBar from './ui/StickyBar';
import DangerAction from './ui/DangerAction';
import NumberField from './ui/NumberField';
import SubNav, { type SubNavItem } from './ui/SubNav';

// Lazy-load heavy Tax configuration pane
const TaxPanel = lazy(() =>
  import('../tax/components/TaxConfigurationPanel').then((m) => ({
    default: m.TaxConfigurationPanel,
  }))
);

type UISnapshot = {
  density: Density;
  sidebarCollapsed: boolean;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
};

type FlagsSnapshot = Flags;

type Snapshot = {
  flags: FlagsSnapshot;
  ui: UISnapshot;
  oversell: OversellPolicy;
};

function shallowEqual<T extends Record<string, any>>(a: T, b: T) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export default function AdminConsole() {
  // Feature flags store
  const { flags, setFlag, resetToDefaults: resetUserFlags } = useFlags();

  // UI preferences store
  const {
    density,
    setDensity,
    sidebarCollapsed,
    setSidebarCollapsed,
    dateFormat,
    setDateFormat,
    numberFormat,
    setNumberFormat,
    resetToDefaults: resetUIPreferences,
  } = useUI();

  const toast = useToast();

  // Local, controlled settings state
  const [localFlags, setLocalFlags] = useState<FlagsSnapshot>(flags);
  const [localUI, setLocalUI] = useState<UISnapshot>({
    density,
    sidebarCollapsed,
    dateFormat,
    numberFormat,
  });
  const [localOversell, setLocalOversell] = useState<OversellPolicy>('block');

  // Baseline snapshot (what's persisted); used for dirty-state comparison and reset of unsaved edits
  const [baseline, setBaseline] = useState<Snapshot | null>(null);

  useEffect(() => {
    // Initialize oversell policy and baseline on mount
    const policy = getOversellPolicy();
    setLocalOversell(policy);
    const uiSnap: UISnapshot = {
      density,
      sidebarCollapsed,
      dateFormat,
      numberFormat,
    };
    setLocalFlags(flags);
    setLocalUI(uiSnap);
    setBaseline({
      flags,
      ui: uiSnap,
      oversell: policy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once, freeze a baseline snapshot

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    const flagsDirty =
      baseline.flags.kds !== localFlags.kds ||
      baseline.flags.loyalty !== localFlags.loyalty ||
      baseline.flags.payments !== localFlags.payments;
    const uiDirty = !shallowEqual(baseline.ui, localUI);
    const invDirty = baseline.oversell !== localOversell;
    return flagsDirty || uiDirty || invDirty;
  }, [baseline, localFlags, localUI, localOversell]);

  // Save all pending changes atomically; rollback on error
  async function onSaveAll() {
    if (!baseline) return;
    const prev = baseline;

    try {
      // Persist Flags changes
      (Object.keys(localFlags) as Array<keyof Flags>).forEach((key) => {
        if (localFlags[key] !== prev.flags[key]) {
          setFlag(key, localFlags[key]);
          auditLogger.logFeatureFlagChange(String(key), prev.flags[key], localFlags[key], 'user');
        }
      });

      // Persist UI changes
      if (localUI.density !== prev.ui.density) {
        setDensity(localUI.density);
      }
      if (localUI.sidebarCollapsed !== prev.ui.sidebarCollapsed) {
        setSidebarCollapsed(localUI.sidebarCollapsed);
      }
      if (localUI.dateFormat !== prev.ui.dateFormat) {
        setDateFormat(localUI.dateFormat);
      }
      if (localUI.numberFormat !== prev.ui.numberFormat) {
        setNumberFormat(localUI.numberFormat);
      }

      // Persist oversell policy
      if (localOversell !== prev.oversell) {
        setOversellPolicy(localOversell);
        auditLogger.logOversellPolicyChange(prev.oversell, localOversell, 'user');
      }

      // Update baseline to current
      setBaseline({
        flags: { ...localFlags },
        ui: { ...localUI },
        oversell: localOversell,
      });

      toast.show('Settings saved');
    } catch (err) {
      // Rollback local edits to baseline
      setLocalFlags(prev.flags);
      setLocalUI(prev.ui);
      setLocalOversell(prev.oversell);
      toast.show('Failed to save changes. Reverted.');
       
      console.error(err);
    }
  }

  // Discard local changes and revert to baseline
  function onResetLocal() {
    if (!baseline) return;
    setLocalFlags(baseline.flags);
    setLocalUI(baseline.ui);
    setLocalOversell(baseline.oversell);
  }

  const subnav: SubNavItem[] = useMemo(
    () => [
      { id: 'general', label: 'General' },
      { id: 'feature-flags', label: 'Feature Flags' },
      { id: 'inventory', label: 'Inventory Rules' },
      { id: 'tax', label: 'Tax &amp; Exemptions' },
      { id: 'payments', label: 'Integrations / Payments' },
      { id: 'danger', label: 'Danger Zone' },
    ],
    []
  );

  if (!baseline) {
    return (
      <div className="text-body text-secondary">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
      {/* Left sub-navigation */}
      <div className="md:col-span-3">
        <SubNav items={subnav} />
      </div>

      {/* Right content */}
      <div className="md:col-span-9 space-y-8">
        {/* General */}
        <SettingSection
          id="general"
          title="General"
          description="Appearance and layout preferences for this device."
        >
          <SettingCard>
            <div className="space-y-4">
              <SettingRow
                label="Density"
                description="Control the vertical spacing density across the app."
                htmlFor="density"
              >
                <Select
                  id="density"
                  value={localUI.density}
                  onChange={(e) => setLocalUI((u) => ({ ...u, density: e.target.value as Density }))}
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ]}
                  aria-label="Density"
                />
              </SettingRow>

              <SettingRow
                label="Sidebar"
                description="Expand or collapse the application sidebar."
                htmlFor="sidebar"
              >
                <Toggle
                  id="sidebar"
                  checked={!localUI.sidebarCollapsed}
                  onChange={(next) => setLocalUI((u) => ({ ...u, sidebarCollapsed: !next }))}
                  label={localUI.sidebarCollapsed ? 'Collapsed' : 'Expanded'}
                />
              </SettingRow>

              <SettingRow
                label="Date format"
                description="Affects how dates are presented in lists and reports."
                htmlFor="date-format"
              >
                <Select
                  id="date-format"
                  value={localUI.dateFormat}
                  onChange={(e) => setLocalUI((u) => ({ ...u, dateFormat: e.target.value as DateFormat }))}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  ]}
                  aria-label="Date format"
                />
              </SettingRow>

              <SettingRow
                label="Number format"
                description="Decimal and thousands separators."
                htmlFor="number-format"
              >
                <Select
                  id="number-format"
                  value={localUI.numberFormat}
                  onChange={(e) => setLocalUI((u) => ({ ...u, numberFormat: e.target.value as NumberFormat }))}
                  options={[
                    { value: '1,234.56', label: '1,234.56' },
                    { value: '1.234,56', label: '1.234,56' },
                  ]}
                  aria-label="Number format"
                />
              </SettingRow>
            </div>
          </SettingCard>
        </SettingSection>

        {/* Feature Flags */}
        <SettingSection
          id="feature-flags"
          title="Feature Flags (User)"
          description="Toggle modules for this device/user. Use Reset below to pull Technical Admin defaults."
        >
          <SettingCard>
            <div className="space-y-3">
              <SettingRow label="KDS module" htmlFor="kds">
                <Toggle
                  id="kds"
                  checked={localFlags.kds}
                  onChange={(next) => setLocalFlags((f) => ({ ...f, kds: next }))}
                />
              </SettingRow>
              <SettingRow label="Loyalty module" htmlFor="loyalty">
                <Toggle
                  id="loyalty"
                  checked={localFlags.loyalty}
                  onChange={(next) => setLocalFlags((f) => ({ ...f, loyalty: next }))}
                />
              </SettingRow>
              <SettingRow label="Payments module" htmlFor="payments">
                <Toggle
                  id="payments"
                  checked={localFlags.payments}
                  onChange={(next) => setLocalFlags((f) => ({ ...f, payments: next }))}
                />
              </SettingRow>
            </div>
          </SettingCard>
        </SettingSection>

        {/* Inventory rules */}
        <SettingSection
          id="inventory"
          title="Inventory Rules"
          description="Control behaviors that affect inventory enforcement."
        >
          <SettingCard>
            <SettingRow
              label="Oversell Policy"
              description={
                <div className="space-y-1">
                  <Description>
                    Block oversell prevents finalization if any component would go below 0.
                  </Description>
                  <Description>
                    Allow negative &amp; alert allows finalization but shows alerts for negative stock.
                  </Description>
                </div>
              }
              htmlFor="oversell"
              alignTop
            >
              <Select
                id="oversell"
                value={localOversell}
                onChange={(e) => setLocalOversell(e.target.value as OversellPolicy)}
                options={[
                  { value: 'block', label: 'Block oversell' },
                  { value: 'allow_negative_alert', label: 'Allow negative & alert' },
                ]}
                aria-label="Inventory oversell policy"
              />
            </SettingRow>
          </SettingCard>
        </SettingSection>

        {/* Tax & Exemptions */}
        <SettingSection
          id="tax"
          title="Tax &amp; Exemptions"
          description="Configure tax rates, groups, and exemptions."
        >
          <SettingCard>
            <Suspense fallback={<div className="text-body text-secondary">Loading tax configuration…</div>}>
              <TaxPanel />
            </Suspense>
          </SettingCard>
        </SettingSection>

        {/* Integrations / Payments */}
        <SettingSection
          id="payments"
          title="Integrations / Payments"
          description="Payment processing and external integrations."
        >
          <SettingCard
            description={
              <span>
                Configure provider, credentials, and settlement settings.{' '}
                <HelpLink href="#" aria-label="Learn more about payment integrations">
                  Learn more
                </HelpLink>
              </span>
            }
          >
            <div className="space-y-3">
              <SettingRow
                label="Provider"
                description="Configure payment providers and settlement options."
                htmlFor="provider"
              >
                <Select
                  id="provider"
                  value="mock"
                  onChange={() => {}}
                  options={[{ value: 'mock', label: 'None (demo)' }]}
                  disabled
                />
              </SettingRow>
              <SettingRow
                label="Batch size (example)"
                description="Processing batch size for payment transactions."
                htmlFor="batch-size"
              >
                <NumberField id="batch-size" value={10} onChange={() => {}} disabled />
              </SettingRow>
            </div>
          </SettingCard>
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection id="danger" title="Danger Zone" description="Destructive settings actions.">
          <SettingCard>
            <div className="space-y-4">
              <DangerAction
                label="Reset user feature flags"
                description="This will reset this user's feature flags to the Technical Admin defaults."
                helpText="Use when a device/user flags drift from the global baseline."
                onConfirm={async () => {
                  const previousFlags = { ...localFlags };
                  resetUserFlags();
                  const updated = useFlags.getState().flags;
                  setLocalFlags(updated);
                  setBaseline((b) => (b ? { ...b, flags: updated } : b));
                  auditLogger.log({
                    action: 'feature_flags_reset',
                    resource: 'feature_flags',
                    details: { scope: 'user', resetToDefaults: true },
                    previousValue: previousFlags,
                  });
                  toast.show('User feature flags reset to defaults');
                }}
                confirmLabel="Reset flags"
              />
              <DangerAction
                label="Reset UI preferences"
                description="This will reset local UI preferences (density, sidebar, formats) for this device."
                onConfirm={async () => {
                  const prev = { ...localUI };
                  resetUIPreferences();
                  // Pull latest after reset
                  const state = useUI.getState();
                  const newUI: UISnapshot = {
                    density: state.density,
                    sidebarCollapsed: state.sidebarCollapsed,
                    dateFormat: state.dateFormat,
                    numberFormat: state.numberFormat,
                  };
                  setLocalUI(newUI);
                  setBaseline((b) => (b ? { ...b, ui: newUI } : b));
                  auditLogger.log({
                    action: 'ui_prefs_reset',
                    resource: 'ui.preferences',
                    details: { scope: 'user', resetToDefaults: true },
                    previousValue: prev,
                    newValue: newUI,
                  });
                  toast.show('UI preferences reset');
                }}
                confirmLabel="Reset preferences"
              />
            </div>
          </SettingCard>
        </SettingSection>
      </div>

      {/* Sticky Save/Reset bar */}
      <StickyBar
        visible={isDirty}
        onSave={onSaveAll}
        onReset={onResetLocal}
      />
    </div>
  );
}

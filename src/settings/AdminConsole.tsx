import { useFlags } from '../store/flags'
import { useUI, type Density } from '../store/ui'
import { getOversellPolicy, setOversellPolicy } from '../inventory/policy'
import { useState, useEffect } from 'react'
import type { OversellPolicy } from '../inventory/types'
import { auditLogger } from '../rbac/audit'
import { TaxConfigurationPanel } from '../tax/components/TaxConfigurationPanel'

export default function AdminConsole() {
  const { flags, setFlag, resetToDefaults } = useFlags()
  const { density, setDensity, sidebarCollapsed, setSidebarCollapsed } = useUI()
  const [oversellPolicy, setOversellPolicyState] = useState<OversellPolicy>('block')

  // Load current oversell policy on mount
  useEffect(() => {
    setOversellPolicyState(getOversellPolicy())
  }, [])

  function handleOversellPolicyChange(newPolicy: OversellPolicy) {
    const previousPolicy = getOversellPolicy()
    setOversellPolicy(newPolicy)
    setOversellPolicyState(newPolicy)
    
    // Log the audit event
    auditLogger.logOversellPolicyChange(previousPolicy, newPolicy, 'user')
  }

  function toggle<K extends keyof typeof flags>(key: K) {
    const previousValue = flags[key]
    const newValue = !flags[key]
    setFlag(key, newValue)
    
    // Log the audit event
    auditLogger.logFeatureFlagChange(key, previousValue, newValue, 'user')
  }

  function onReset() {
    const previousFlags = { ...flags }
    resetToDefaults()
    
    // Log the audit event for flags reset
    auditLogger.log({
      action: 'feature_flags_reset',
      resource: 'feature_flags',
      details: { scope: 'user', resetToDefaults: true },
      previousValue: previousFlags
    })
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-2">Feature Flags (User)</h3>
        <p className="text-sm text-gray-600 mb-2">Toggle modules for this device/user. Use "Reset to defaults" to pull Technical Admin defaults.</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flags.kds} onChange={() => toggle('kds')} />
            <span>KDS module</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flags.loyalty} onChange={() => toggle('loyalty')} />
            <span>Loyalty module</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flags.payments} onChange={() => toggle('payments')} />
            <span>Payments module</span>
          </label>
        </div>
        <div className="mt-3">
          <button type="button" className="px-3 py-1 border rounded" onClick={onReset}>Reset to defaults</button>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Layout Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-40">Density</span>
            <select
              aria-label="Density"
              className="border rounded px-2 py-1"
              value={density}
              onChange={(e) => setDensity(e.target.value as Density)}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-40">Sidebar</span>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-40">Formats (Preview)</span>
            <span className="text-sm text-gray-600">Set date/number formats in a later pass.</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Inventory Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-40">Oversell Policy</span>
            <select
              aria-label="Inventory Oversell Policy"
              className="border rounded px-2 py-1"
              value={oversellPolicy}
              onChange={(e) => handleOversellPolicyChange(e.target.value as OversellPolicy)}
            >
              <option value="block">Block oversell</option>
              <option value="allow_negative_alert">Allow negative & alert</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Block oversell:</strong> Prevents finalization if any component would go below 0.</p>
            <p><strong>Allow negative & alert:</strong> Allows finalization but shows alerts for negative stock.</p>
          </div>
        </div>
      </section>

      {/* Tax Configuration Section */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Tax Management</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <TaxConfigurationPanel />
        </div>
      </section>
    </div>
  )
}
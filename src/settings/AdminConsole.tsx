import { useFlags } from '../store/flags'
import { useUI } from '../store/ui'
import { getOversellPolicy, setOversellPolicy } from '../inventory/policy'
import { useState, useEffect } from 'react'
import type { OversellPolicy } from '../inventory/types'

export default function AdminConsole() {
  const { flags, setFlag, resetToDefaults } = useFlags()
  const { density, setDensity, sidebarCollapsed, setSidebarCollapsed } = useUI()
  const [oversellPolicy, setOversellPolicyState] = useState<OversellPolicy>('block')

  // Load current oversell policy on mount
  useEffect(() => {
    setOversellPolicyState(getOversellPolicy())
  }, [])

  function handleOversellPolicyChange(newPolicy: OversellPolicy) {
    setOversellPolicy(newPolicy)
    setOversellPolicyState(newPolicy)
  }

  function toggle<K extends keyof typeof flags>(key: K) {
    setFlag(key, !flags[key])
  }

  function onReset() {
    resetToDefaults()
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
              onChange={(e) => setDensity(e.target.value as any)}
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
    </div>
  )
}
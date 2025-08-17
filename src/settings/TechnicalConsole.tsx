import { useState } from 'react'
import { type Flags, loadDefaults, saveDefaults } from '../lib/flags'
import { getRole, RANK } from '../rbac/roles'

export default function TechnicalConsole() {
  const role = getRole()
  const allowed = RANK[role] >= RANK.TECH_ADMIN

  if (!allowed) {
    return (
      <div role="note" className="rounded border p-3 bg-gray-50 text-gray-700">
        Technical Console requires <strong>Technical Admin</strong> role.
      </div>
    )
  }

  const [defaults, setDefaults] = useState<Flags>(() => loadDefaults())

  function toggle<K extends keyof Flags>(key: K) {
    const next = { ...defaults, [key]: !defaults[key] }
    setDefaults(next)
  }

  function onSave() {
    saveDefaults(defaults)
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-2">Feature Flag Defaults (Global)</h3>
        <p className="text-sm text-gray-600 mb-2">These act as the baseline for all users/devices. Admins can reset user flags back to these defaults.</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={defaults.kds} onChange={() => toggle('kds')} />
            <span>KDS default</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={defaults.loyalty} onChange={() => toggle('loyalty')} />
            <span>Loyalty default</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={defaults.payments} onChange={() => toggle('payments')} />
            <span>Payments default</span>
          </label>
        </div>
        <div className="mt-3">
          <button type="button" className="px-3 py-1 border rounded" onClick={onSave}>Save defaults</button>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Environment & Platform (Placeholders)</h3>
        <ul className="list-disc ml-6 text-sm text-gray-700">
          <li>Replication endpoint (COUCH_URL, COUCH_DB_PREFIX)</li>
          <li>Payments public key (PAYMENT_PUBLIC_KEY)</li>
          <li>Kiosk/Electron policy note (enable when wrapping)</li>
          <li>Backups/exports policy</li>
          <li>Telemetry & diagnostics opt-in</li>
        </ul>
      </section>
    </div>
  )
}
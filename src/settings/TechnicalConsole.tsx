import { useState, useEffect } from 'react'
import { type Flags, loadDefaults, saveDefaults } from '../lib/flags'
import { getRole, RANK } from '../rbac/roles'
import { configureRemote, startReplication, stopReplication, subscribe } from '../db/sync'
import { openLocalDB } from '../db/pouch'

function ReplicationPanel() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('rms.sync.url') || 'http://localhost:5984')
  const [prefix, setPrefix] = useState(localStorage.getItem('rms.sync.prefix') || 'rmsv3_')
  const [status, setStatus] = useState<'idle'|'active'|'paused'|'error'>('idle')
  const branchId = 'main' // replace with real branch/tenant id

  useEffect(() => subscribe((s) => setStatus(s)), [])

  async function onStart() {
    localStorage.setItem('rms.sync.url', baseUrl)
    localStorage.setItem('rms.sync.prefix', prefix)
    configureRemote({ baseUrl, dbPrefix: prefix }, branchId)
    const db = await openLocalDB({ name: 'rmsv3_events' })
    startReplication(db, branchId)
  }
  function onStop() { stopReplication() }

  return (
    <section className="mt-6">
      <h3 className="text-base font-semibold mb-2">Replication</h3>
      <div className="flex gap-2 items-center">
        <input className="border px-2 py-1 rounded w-72" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} aria-label="Couch URL" />
        <input className="border px-2 py-1 rounded w-40" value={prefix} onChange={e=>setPrefix(e.target.value)} aria-label="DB Prefix" />
        <button className="px-3 py-1 border rounded" onClick={onStart}>Start</button>
        <button className="px-3 py-1 border rounded" onClick={onStop}>Stop</button>
        <span className="text-sm text-gray-600">Status: {status}</span>
      </div>
    </section>
  )
}

export default function TechnicalConsole() {
  const role = getRole()
  const allowed = RANK[role] >= RANK.TECH_ADMIN
  const [defaults, setDefaults] = useState<Flags>(() => loadDefaults())

  if (!allowed) {
    return (
      <div role="note" className="rounded border p-3 bg-gray-50 text-gray-700">
        Technical Console requires <strong>Technical Admin</strong> role.
      </div>
    )
  }

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

      <ReplicationPanel />
    </div>
  )
}
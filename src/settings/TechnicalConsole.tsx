import { useState, useEffect } from 'react'
import { type Flags, loadDefaults, saveDefaults } from '../lib/flags'
import { getRole, RANK } from '../rbac/roles'
import { syncManager, type SyncConfig, type SyncStatusEvent } from '../db/sync'

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
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    url: 'http://localhost:5984',
    dbPrefix: 'rmsv3_',
    auth: { username: '', password: '' }
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatusEvent | null>(null)
  const [isReplicating, setIsReplicating] = useState(false)

  useEffect(() => {
    const handleStatus = (event: SyncStatusEvent) => {
      setSyncStatus(event)
      setIsReplicating(syncManager.getStatus().isReplicating)
    }

    syncManager.on('status', handleStatus)
    setIsReplicating(syncManager.getStatus().isReplicating)

    return () => {
      syncManager.off('status', handleStatus)
    }
  }, [])

  function toggle<K extends keyof Flags>(key: K) {
    const next = { ...defaults, [key]: !defaults[key] }
    setDefaults(next)
  }

  function onSave() {
    saveDefaults(defaults)
  }

  function onConfigureSync() {
    syncManager.configure(syncConfig)
  }

  async function onStartReplication() {
    try {
      await syncManager.startReplication('main')
    } catch (error) {
      console.error('Failed to start replication:', error)
    }
  }

  async function onStopReplication() {
    try {
      await syncManager.stopReplication()
    } catch (error) {
      console.error('Failed to stop replication:', error)
    }
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
        <h3 className="text-base font-semibold mb-2">Sync Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">Configure background replication to CouchDB-compatible remote database.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Remote URL</label>
            <input
              type="url"
              value={syncConfig.url}
              onChange={(e) => setSyncConfig(prev => ({ ...prev, url: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="http://localhost:5984"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Database Prefix</label>
            <input
              type="text"
              value={syncConfig.dbPrefix}
              onChange={(e) => setSyncConfig(prev => ({ ...prev, dbPrefix: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="rmsv3_"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username (Optional)</label>
              <input
                type="text"
                value={syncConfig.auth?.username || ''}
                onChange={(e) => setSyncConfig(prev => ({
                  ...prev,
                  auth: { ...prev.auth, username: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password (Optional)</label>
              <input
                type="password"
                value={syncConfig.auth?.password || ''}
                onChange={(e) => setSyncConfig(prev => ({
                  ...prev,
                  auth: { ...prev.auth, password: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfigureSync}
              className="px-3 py-2 border rounded-md bg-blue-50 hover:bg-blue-100"
            >
              Configure
            </button>
            
            {!isReplicating ? (
              <button
                type="button"
                onClick={onStartReplication}
                className="px-3 py-2 border rounded-md bg-green-50 hover:bg-green-100"
              >
                Start Replication
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopReplication}
                className="px-3 py-2 border rounded-md bg-red-50 hover:bg-red-100"
              >
                Stop Replication
              </button>
            )}
          </div>
          
          {syncStatus && (
            <div className={`p-3 rounded-md text-sm ${
              syncStatus.status === 'sync.connected' || syncStatus.status === 'sync.active'
                ? 'bg-green-50 text-green-800'
                : syncStatus.status === 'sync.error'
                ? 'bg-red-50 text-red-800'
                : 'bg-yellow-50 text-yellow-800'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  syncStatus.status === 'sync.connected' || syncStatus.status === 'sync.active'
                    ? 'bg-green-500'
                    : syncStatus.status === 'sync.error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`} />
                <span className="font-medium">{syncStatus.status.replace('sync.', '').toUpperCase()}</span>
              </div>
              {syncStatus.message && (
                <p className="mt-1">{syncStatus.message}</p>
              )}
              {syncStatus.error && (
                <p className="mt-1 text-xs opacity-75">{syncStatus.error.message}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
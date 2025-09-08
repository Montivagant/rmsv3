import { useState, useEffect } from 'react'
import { type Flags, loadDefaults, saveDefaults } from '../lib/flags'
import { getRole, RANK } from '../rbac/roles'
import { useSyncStatus, useNetworkStatus, type SyncState } from '../db/syncManager'
import { auditLogger } from '../rbac/audit'

function ReplicationPanel() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('rms.sync.url') || 'http://localhost:5984')
  const [prefix, setPrefix] = useState(localStorage.getItem('rms.sync.prefix') || 'rmsv3_')
  const [status, setStatus] = useState<SyncState>('idle')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [statusInfo, setStatusInfo] = useState<any>(null)
  const branchId = 'main' // replace with real branch/tenant id

  const syncStatus = useSyncStatus()
  const networkStatus = useNetworkStatus()

  useEffect(() => {
    const unsubscribeSync = syncStatus.subscribe((state, info) => {
      setStatus(state)
      setStatusInfo(info)
    })
    const unsubscribeNetwork = networkStatus.subscribe(setIsOnline)
    
    return () => {
      unsubscribeSync()
      unsubscribeNetwork()
    }
  }, [networkStatus, syncStatus])

  async function onStart() {
    localStorage.setItem('rms.sync.url', baseUrl)
    localStorage.setItem('rms.sync.prefix', prefix)
    
    const configured = await syncStatus.configure({
      baseUrl,
      dbPrefix: prefix,
      branchId
    })
    
    if (configured) {
      await syncStatus.start()
    }
    
    // Log the audit event
    auditLogger.logReplicationAction('start', { baseUrl, prefix, branchId })
  }
  
  function onStop() { 
    syncStatus.stop()
    
    // Log the audit event
    auditLogger.logReplicationAction('stop')
  }

  const getStatusColor = (status: SyncState) => {
    switch (status) {
      case 'active': return 'text-success'
      case 'error': return 'text-error'
      case 'offline': return 'text-warning'
      case 'unavailable': return 'text-tertiary'
      case 'paused': return 'text-warning'
      default: return 'text-secondary'
    }
  }

  const getStatusIcon = (status: SyncState) => {
    switch (status) {
      case 'active': return '??'
      case 'error': return '?'
      case 'offline': return '??'
      case 'unavailable': return '??'
      case 'paused': return '??'
      default: return '?'
    }
  }

  return (
    <section className="mt-6">
      <h3 className="text-base font-semibold mb-2">CouchDB Replication</h3>
      <div className="space-y-3">
        {/* Network Status */}
        <div className="flex items-center gap-2 text-sm">
          <span>Network:</span>
          <span className={isOnline ? 'text-success-600' : 'text-error-600'}>
            {isOnline ? '?? Online' : '?? Offline'}
          </span>
        </div>

        {/* Sync Configuration */}
        <div className="flex gap-2 items-center">
          <input 
            className="border border-border bg-surface px-2 py-1 rounded w-72" 
            value={baseUrl} 
            onChange={e => setBaseUrl(e.target.value)} 
            placeholder="Database server URL (e.g., http://localhost:5984)"
            aria-label="CouchDB URL" 
          />
          <input 
            className="border border-border bg-surface px-2 py-1 rounded w-40" 
            value={prefix} 
            onChange={e => setPrefix(e.target.value)} 
            placeholder="Database prefix (optional)"
            aria-label="Database Prefix" 
          />
          <button 
            className="px-3 py-1 border rounded bg-success-50 hover:bg-success-100 disabled:opacity-50" 
            onClick={onStart}
            disabled={!isOnline || status === 'active'}
          >
            Start
          </button>
          <button 
            className="px-3 py-1 border rounded bg-error-50 hover:bg-error-100 disabled:opacity-50" 
            onClick={onStop}
            disabled={status === 'idle'}
          >
            Stop
          </button>
        </div>

        {/* Status Display */}
        <div className="flex items-center gap-2 text-sm">
          <span>Status:</span>
          <span className={getStatusColor(status)}>
            {getStatusIcon(status)} {status}
          </span>
          {statusInfo && (
            <span className="text-xs text-text-muted ml-2">
              {statusInfo.reason && `(${statusInfo.reason})`}
              {statusInfo.error && ` - ${statusInfo.error}`}
            </span>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 mt-2">
          <p>?? Sync is automatically paused when offline and resumed when network connection is restored.</p>
          {status === 'unavailable' && (
            <p className="text-orange-600">?? PouchDB sync is disabled in development mode due to module conflicts.</p>
          )}
        </div>
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
    const previousValue = defaults[key]
    const newValue = !defaults[key]
    const next = { ...defaults, [key]: newValue }
    setDefaults(next)
    
    // Log the audit event
    auditLogger.logFeatureFlagChange(key, previousValue, newValue, 'global')
  }

  function onSave() {
    const previousDefaults = loadDefaults()
    saveDefaults(defaults)
    
    // Log the audit event
    auditLogger.log({
      action: 'feature_flag_defaults_save',
      resource: 'feature_flags.defaults',
      details: { scope: 'global' },
      previousValue: previousDefaults,
      newValue: defaults
    })
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

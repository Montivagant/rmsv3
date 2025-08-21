import PouchDB from 'pouchdb'
import type { DBEvent } from './pouch'

type SyncState = 'idle' | 'active' | 'paused' | 'error'
type SyncCfg = { baseUrl: string; dbPrefix: string; username?: string; password?: string }
type Sub = (s: SyncState, info?: any) => void

let subs: Sub[] = []
let cancel: (() => void) | null = null
let remote: PouchDB.Database<DBEvent> | null = null

export function configureRemote({ baseUrl, dbPrefix, username, password }: SyncCfg, branchId: string) {
  const dbName = `${dbPrefix}events_${branchId}`
  const url = `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(dbName)}`
  // Optional Basic auth
  const ajax = username && password
    ? {
        fetch: (u: RequestInfo, opts: RequestInit = {}) => {
          const hdrs = new Headers(opts.headers || {})
          hdrs.set('Authorization', 'Basic ' + btoa(`${username}:${password}`))
          return fetch(u, { ...opts, headers: hdrs })
        },
      }
    : undefined
  remote = new PouchDB<DBEvent>(url, ajax ? { fetch: ajax.fetch as any } : undefined)
  return remote
}

export function subscribe(fn: Sub) {
  subs.push(fn)
  return () => { subs = subs.filter(s => s !== fn) }
}

function emit(s: SyncState, info?: any) { subs.forEach(fn => fn(s, info)) }

export function startReplication(local: PouchDB.Database<DBEvent>, branchId: string) {
  if (!remote) throw new Error('Remote not configured. Call configureRemote() first.')
  // live, retry both directions
  const push = local.replicate.to(remote, { live: true, retry: true })
  const pull = local.replicate.from(remote, { live: true, retry: true })

  const onChange = () => emit('active')
  const onPaused = (info: any) => emit('paused', info)
  const onError = (err: any) => emit('error', err)

  push.on('change', onChange).on('paused', onPaused).on('error', onError)
  pull.on('change', onChange).on('paused', onPaused).on('error', onError)

  cancel = () => { push.cancel(); pull.cancel(); emit('idle') }
  emit('active')
}

export function stopReplication() {
  if (cancel) cancel()
  cancel = null
}
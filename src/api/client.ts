const DEFAULT_DEV_API_BASE = (import.meta as any).env?.DEV ? 'http://localhost:3001' : ''
const rawApiBase = ((import.meta as any).env?.VITE_API_BASE || DEFAULT_DEV_API_BASE).toString().trim()
const API_BASE: string = rawApiBase.replace(/\/$/, '')

function withBase(path: string): string {
  if (!path) return path
  if (!API_BASE) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (!path.startsWith('/')) return `${API_BASE}/${path}`
  return `${API_BASE}${path}`
}

export async function fetchJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = withBase(path)
  const res = await fetch(url, init)
  const ct = res.headers.get('content-type') || ''
  if (!res.ok) {
    let body = ''
    try { body = await res.text() } catch {
      // Ignore errors when trying to read response body
    }
    throw Object.assign(new Error(`Request failed (${res.status}) for ${url}: ${body.slice(0,120)}...`), { status: res.status })
  }
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Expected JSON but got ${ct || 'unknown'} for ${url}: ${text.slice(0,120)}...`)
  }
  return res.json() as Promise<T>
}

export async function postJSON<T = any>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return fetchJSON<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  })
}

export async function patchJSON<T = any>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return fetchJSON<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  })
}

export async function putJSON<T = any>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return fetchJSON<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  })
}

export async function deleteJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  return fetchJSON<T>(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
}

export const apiBase = API_BASE
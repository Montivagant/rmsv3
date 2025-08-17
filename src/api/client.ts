export async function fetchJSON(path: string) {
  const res = await fetch(path)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text()
    throw new Error(`Expected JSON but got ${ct || 'unknown'} for ${path}: ${text.slice(0,120)}...`)
  }
  return res.json()
}
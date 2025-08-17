export type Flags = { kds: boolean; loyalty: boolean; payments: boolean }

const USER_KEY = 'rms.flags.v1'
const DEFAULTS_KEY = 'rms.flags.defaults.v1'

// Built-in technical defaults (used if no saved defaults exist)
const BUILTIN_DEFAULTS: Flags = {
  kds: true,
  loyalty: false,
  payments: false,
}

export function loadDefaults(): Flags {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY)
    return raw ? { ...BUILTIN_DEFAULTS, ...JSON.parse(raw) } : { ...BUILTIN_DEFAULTS }
  } catch {
    return { ...BUILTIN_DEFAULTS }
  }
}

export function saveDefaults(next: Flags) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(next))
}

export function loadFlags(): Flags {
  const defaults = loadDefaults()
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
}

export function saveFlags(flags: Flags) {
  localStorage.setItem(USER_KEY, JSON.stringify(flags))
}

export function resetFlags(): Flags {
  const d = loadDefaults()
  saveFlags(d)
  return d
}
/**
 * Device utilities
 * Provides a stable device identifier for audit and event enrichment
 */

const DEVICE_ID_KEY = 'rms_device_id';

function generateDeviceId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `dev-${rand}`;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const next = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return generateDeviceId();
  }
}



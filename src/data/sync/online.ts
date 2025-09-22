// Online/offline helpers
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function onOnline(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const fn = () => handler();
  window.addEventListener('online', fn);
  return () => window.removeEventListener('online', fn);
}


import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

type Toast = { id: number; message: string }
type Ctx = { show: (message: string) => void; clear: () => void; toasts: Toast[] }

const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random() * 1000 // Add randomness to prevent duplicate keys
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }, [])
  const clear = useCallback(() => setToasts([]), [])
  return (
    <ToastCtx.Provider value={{ show, clear, toasts }}>
      {children}
      {/* Live region for tests & a11y */}
      <div role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-3 right-3 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="rounded border bg-surface border-border shadow px-3 py-2 text-sm text-text-primary">{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}
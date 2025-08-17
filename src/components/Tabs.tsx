import type { ReactNode } from 'react'
import { useId, useState } from 'react'

type Tab = { id: string; label: string; content: ReactNode }
type Props = { tabs: Tab[]; initialId?: string; ariaLabel?: string }

export default function Tabs({ tabs, initialId, ariaLabel = 'Settings Sections' }: Props) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id)
  const tablistId = useId()

  return (
    <div>
      <div role="tablist" aria-label={ariaLabel} id={tablistId} className="flex gap-2 border-b mb-3">
        {tabs.map(t => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`${t.id}-panel`}
              id={`${t.id}-tab`}
              className={`px-3 py-2 border-b-2 ${selected ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600'}`}
              onClick={() => setActive(t.id)}
              type="button"
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {tabs.map(t => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${t.id}-panel`}
          aria-labelledby={`${t.id}-tab`}
          hidden={t.id !== active}
          className="mt-2"
        >
          {t.content}
        </div>
      ))}
    </div>
  )
}
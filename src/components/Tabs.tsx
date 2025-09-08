import type { ReactNode } from 'react'
import { useId, useState, useEffect } from 'react'

type Tab = { id: string; label: string; content: ReactNode }
type Props = { 
  tabs: Tab[]; 
  initialId?: string; 
  ariaLabel?: string;
  onChange?: (tabId: string) => void;
}

export default function Tabs({ tabs, initialId, ariaLabel = 'Settings Sections', onChange }: Props) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id)
  const tablistId = useId()
  
  // Update active tab when initialId changes
  useEffect(() => {
    if (initialId && initialId !== active) {
      setActive(initialId);
    }
  }, [initialId]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActive(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

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
              className={`px-3 py-2 border-b-2 ${selected ? 'border-brand text-brand' : 'border-transparent text-text-secondary'}`}
              onClick={() => handleTabChange(t.id)}
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

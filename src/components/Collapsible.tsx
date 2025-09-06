import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface CollapsibleProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean; // controlled
  onOpenChange?: (open: boolean) => void;
  className?: string;
  panelClassName?: string;
  buttonClassName?: string;
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  panelClassName,
  buttonClassName,
}: CollapsibleProps) {
  const reactId = useId();
  const regionId = `collapsible-panel-${reactId}`;
  const headerId = `collapsible-header-${reactId}`;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn('border border-border-primary rounded-md', className)}>
      <button
        id={headerId}
        type="button"
        className={cn(
          'w-full flex items-center justify-between px-3 py-2',
          'text-left focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
          buttonClassName
        )}
        aria-expanded={isOpen}
        aria-controls={regionId}
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={cn('h-4 w-4 transition-transform text-text-tertiary', isOpen ? 'rotate-90' : '')}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
          <span className="text-body font-medium text-text-primary">{title}</span>
        </div>
      </button>

      <div
        id={regionId}
        role="region"
        aria-labelledby={headerId}
        aria-hidden={!isOpen}
        className={cn(
          'px-3 pb-3',
          isOpen ? 'block' : 'hidden',
          panelClassName
        )}
      >
        <div className="text-body-sm text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

export type { CollapsibleProps };

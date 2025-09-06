import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export type SubNavItem = {
  id: string;       // section id (anchor target)
  label: string;    // visible label
};

type SubNavProps = {
  items: SubNavItem[];
  className?: string;
};

/**
 * SubNav - left-side in-page navigation for settings sections.
 * - Uses anchors to scroll to sections.
 * - Highlights active section based on scroll (IntersectionObserver).
 */
export default function SubNav({ items, className }: SubNavProps) {
  const [active, setActive] = useState<string>(items[0]?.id);

  useEffect(() => {
    const sectionEls = items
      .map(i => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sectionEls.length === 0) return;

    // Guard for test environments (jsdom) where IntersectionObserver is not available
    const hasIO =
      typeof window !== 'undefined' &&
      typeof (window as any).IntersectionObserver !== 'undefined';

    if (!hasIO) {
      // Fallback: keep the first section active to avoid crashing in tests
      setActive(sectionEls[0].id);
      return;
    }

    const observer = new (window as any).IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio - a.intersectionRatio));

        if (visible[0]) {
          setActive((visible[0].target as HTMLElement).id);
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -60% 0px', // trigger a bit before the section mid
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Settings Sections"
      className={cn('bg-surface border border-primary rounded-lg p-3 md:p-4 sticky top-4', className)}
    >
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  'block px-3 py-2 rounded-md text-body',
                  'focus-ring transition-colors',
                  isActive
                    ? 'bg-surface-secondary text-primary'
                    : 'text-secondary hover:bg-surface-secondary hover:text-primary'
                )}
                aria-current={isActive ? 'true' : undefined}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

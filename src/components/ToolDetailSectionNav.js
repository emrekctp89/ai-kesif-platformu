'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sticky in-page section jump links for long tool detail pages.
 * Only shows anchors that exist in the DOM (optional sections hide themselves).
 */
export function ToolDetailSectionNav({ items }) {
  const [visibleIds, setVisibleIds] = useState(() => items.map((item) => item.id));
  const [activeId, setActiveId] = useState(items[0]?.id || null);

  const itemIds = useMemo(() => items.map((item) => item.id).join('|'), [items]);

  useEffect(() => {
    const resolved = items
      .map((item) => item.id)
      .filter((id) => typeof document !== 'undefined' && document.getElementById(id));
    setVisibleIds(resolved.length > 0 ? resolved : items.map((item) => item.id));
  }, [itemIds, items]);

  useEffect(() => {
    if (typeof window === 'undefined' || visibleIds.length === 0) return;

    const elements = visibleIds.map((id) => document.getElementById(id)).filter(Boolean);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (intersecting[0]?.target?.id) {
          setActiveId(intersecting[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visibleIds]);

  const navItems = items.filter((item) => visibleIds.includes(item.id));
  if (navItems.length < 2) return null;

  return (
    <nav
      aria-label={items[0]?.navLabel || 'Sayfa bölümleri'}
      className="sticky top-16 z-30 -mx-1 mb-2 overflow-x-auto px-1 py-1"
    >
      <div className="inline-flex min-w-full gap-1 rounded-full border border-border/60 bg-background/90 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:min-w-0">
        {navItems.map((item) => {
          const isActive = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(item.id);
                if (!target) return;
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(item.id);
                window.history.replaceState(null, '', `#${item.id}`);
              }}
              className={cn(
                'inline-flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={isActive ? 'true' : undefined}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

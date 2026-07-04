'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function normalizeToolLink(link) {
  if (!link) return null;

  const rawValue = String(link).trim();
  if (!rawValue) return null;

  try {
    return new URL(rawValue).toString();
  } catch {
    try {
      return new URL(`https://${rawValue}`).toString();
    } catch {
      return null;
    }
  }
}

export default function ToolIcon({ name, link, className }) {
  const fallbackLetter =
    String(name || '?')
      .trim()
      .slice(0, 1)
      .toUpperCase() || '?';
  const normalizedLink = React.useMemo(() => normalizeToolLink(link), [link]);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [normalizedLink]);

  const iconSrc = normalizedLink
    ? `/api/tool-icon?link=${encodeURIComponent(normalizedLink)}`
    : null;

  return (
    <Avatar className={cn('h-7 w-7 shrink-0 rounded-md border bg-background', className)}>
      {!hasError && iconSrc ? (
        <AvatarImage
          src={iconSrc}
          alt={`${name || 'Araç'} ikonu`}
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : null}
      <AvatarFallback className="rounded-md text-[10px] font-semibold">
        {fallbackLetter}
      </AvatarFallback>
    </Avatar>
  );
}

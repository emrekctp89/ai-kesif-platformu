'use client';

import { useEffect, useRef } from 'react';

/**
 * Fire-and-forget published-post view counter.
 * One attempt per mount / slug; ignores failures (migration optional).
 */
export function PostViewTracker({ slug }) {
  const sent = useRef(false);

  useEffect(() => {
    const value = String(slug || '').trim();
    if (!value || sent.current) return;
    sent.current = true;

    const key = `post-view:${value}`;
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
      sessionStorage?.setItem(key, '1');
    } catch {
      // private mode / blocked storage — still try once per mount
    }

    fetch('/api/blog/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: value }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}

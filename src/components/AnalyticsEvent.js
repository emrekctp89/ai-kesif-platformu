'use client';

import { useEffect, useMemo, useRef } from 'react';
import { trackEvent } from '@/utils/analytics';

/**
 * Fire a one-shot analytics event when the component mounts
 * (or when `name` / serialised `parameters` change).
 */
export function AnalyticsEvent({ name, parameters }) {
  const parametersKey = useMemo(() => {
    try {
      return JSON.stringify(parameters ?? {});
    } catch {
      return '';
    }
  }, [parameters]);

  const lastFiredKey = useRef(null);

  useEffect(() => {
    if (!name) return;
    const fireKey = `${name}::${parametersKey}`;
    if (lastFiredKey.current === fireKey) return;
    lastFiredKey.current = fireKey;

    let parsed = {};
    try {
      parsed = parametersKey ? JSON.parse(parametersKey) : {};
    } catch {
      parsed = {};
    }

    trackEvent(name, parsed);
  }, [name, parametersKey]);

  return null;
}

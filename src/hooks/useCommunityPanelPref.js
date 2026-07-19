'use client';

import { useCallback, useEffect, useState } from 'react';
import { COMMUNITY_PANEL_STORAGE_KEY } from '@/lib/navFeatures';

/**
 * Logged-in users can opt into community shortcuts in the profile menu.
 * Default: off (community stays out of the main flow).
 */
export function useCommunityPanelPref() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COMMUNITY_PANEL_STORAGE_KEY);
      setEnabled(raw === '1' || raw === 'true');
    } catch {
      setEnabled(false);
    }
    setReady(true);
  }, []);

  const setCommunityPanelEnabled = useCallback((next) => {
    const value = Boolean(next);
    setEnabled(value);
    try {
      window.localStorage.setItem(COMMUNITY_PANEL_STORAGE_KEY, value ? '1' : '0');
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const toggleCommunityPanel = useCallback(() => {
    setCommunityPanelEnabled(!enabled);
  }, [enabled, setCommunityPanelEnabled]);

  return {
    communityPanelEnabled: enabled,
    communityPanelReady: ready,
    setCommunityPanelEnabled,
    toggleCommunityPanel,
  };
}

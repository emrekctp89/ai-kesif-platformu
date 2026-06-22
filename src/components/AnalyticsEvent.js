"use client";

import { useEffect } from "react";
import { trackEvent } from "@/utils/analytics";

export function AnalyticsEvent({ name, parameters }) {
  useEffect(() => {
    trackEvent(name, parameters);
  }, [name, parameters]);

  return null;
}

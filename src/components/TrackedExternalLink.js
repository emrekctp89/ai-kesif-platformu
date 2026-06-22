"use client";

import { trackEvent } from "@/utils/analytics";

export function TrackedExternalLink({
  eventName = "official_site_click",
  eventParameters,
  children,
  ...props
}) {
  return (
    <a
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        trackEvent(eventName, eventParameters);
      }}
    >
      {children}
    </a>
  );
}

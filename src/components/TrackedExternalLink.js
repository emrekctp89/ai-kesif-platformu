"use client";

import { trackEvent } from "@/utils/analytics";

export function TrackedExternalLink({
  eventName = "official_site_click",
  eventParameters,
  children,
  ...props
}) {
  const hrefValue = typeof props.href === "string" ? props.href : "";

  return (
    <a
      {...props}
      onClick={(event) => {
        props.onClick?.(event);

        if (event.defaultPrevented) return;

        let destinationHost;
        try {
          destinationHost = hrefValue ? new URL(hrefValue).hostname : undefined;
        } catch {
          destinationHost = undefined;
        }

        trackEvent(eventName, {
          destination_url: hrefValue || undefined,
          destination_host: destinationHost,
          ...eventParameters,
        });
      }}
    >
      {children}
    </a>
  );
}

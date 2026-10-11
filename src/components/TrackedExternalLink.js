'use client';

import { trackEvent } from '@/utils/analytics';
import { buildTrackedOutboundUrl, preserveReferrerRel } from '@/utils/outboundLinks';

export function TrackedExternalLink({
  eventName = 'official_site_click',
  eventParameters,
  children,
  ...props
}) {
  const hrefValue = typeof props.href === 'string' ? props.href : '';
  const utmContent = eventParameters?.placement || eventParameters?.source;
  const trackedHref = buildTrackedOutboundUrl(hrefValue, { content: utmContent });
  const rel = preserveReferrerRel(props.rel);

  return (
    <a
      {...props}
      href={trackedHref}
      rel={rel}
      referrerPolicy={props.referrerPolicy || 'strict-origin-when-cross-origin'}
      onClick={(event) => {
        props.onClick?.(event);

        if (event.defaultPrevented) return;

        let destinationHost;
        try {
          destinationHost = trackedHref ? new URL(trackedHref).hostname : undefined;
        } catch {
          destinationHost = undefined;
        }

        trackEvent(eventName, {
          destination_url: trackedHref || undefined,
          destination_host: destinationHost,
          ...eventParameters,
        });
      }}
    >
      {children}
    </a>
  );
}

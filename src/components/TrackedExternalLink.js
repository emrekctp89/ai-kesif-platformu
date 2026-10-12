'use client';

import { trackEvent } from '@/utils/analytics';
import {
  buildTrackedOutboundUrl,
  preserveReferrerRel,
  recordOutboundClick,
} from '@/utils/outboundLinks';

export function TrackedExternalLink({
  eventName = 'official_site_click',
  eventParameters,
  toolId,
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
        recordOutboundClick({
          toolId,
          destinationUrl: trackedHref,
          placement: eventParameters?.placement || eventParameters?.source,
        });
      }}
    >
      {children}
    </a>
  );
}

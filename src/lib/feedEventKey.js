/**
 * Shared list key for activity feed events.
 * Kept free of 'use client' so Server Components can call it safely.
 */
export function getFeedEventKey(event, index = 0) {
  const details = event?.details || {};
  return [
    event?.event_type || 'event',
    event?.username || 'user',
    details.tool_slug || details.item_id || details.prompt_title || index,
    event?.event_time || index,
  ].join('-');
}

'use client';

function cleanParameters(parameters = {}) {
  return Object.fromEntries(
    Object.entries(parameters).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        ['string', 'number', 'boolean'].includes(typeof value)
    )
  );
}

export function trackEvent(name, parameters = {}) {
  if (typeof window === 'undefined') return;

  const cleanedParameters = cleanParameters(parameters);

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, cleanedParameters);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...cleanedParameters });
}

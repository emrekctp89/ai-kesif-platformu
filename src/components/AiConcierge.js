'use client';

import { KasifWidget } from '@/components/kasif/KasifWidget';

// Kept as a thin backwards-compatible wrapper: the original standalone concierge
// chat UI has been superseded by the shared Kâþif chat experience
// (KasifChatCore) rendered inside the global KasifWidget.
export function AiConcierge(props) {
  return <KasifWidget {...props} />;
}
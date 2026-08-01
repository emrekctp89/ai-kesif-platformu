/**
 * Public barrel for Kâşif client-safe helpers.
 * Platform UI must import from this entry instead of deep internal paths when possible.
 * Keep server-only modules (packAccessServer, partnerRunner, softLandingPin, addToolQueue, etc.) out.
 */

export { formatKasifGoalLabel, formatKasifGoalLabels } from './goalLabels';
export { matchJobPack, listJobPacks, getJobPackById } from './jobPacks';
export {
  buildWorkmindHandoffUrl,
  getJobSessionProgress,
  jobSessionFromWorkflow,
  jobSessionStorageKey,
  markJobSessionStepDone,
  normalizeJobSession,
  selectToolForJobStep,
} from './jobSession';
export { resolveJobWizard } from './jobWizards';
export {
  KASIF_VERSION,
  KASIF_RELEASE_NAME,
  KASIF_RELEASED_AT,
  KASIF_CAPABILITIES,
  buildKasifRuntimeStatus,
} from './release';
export {
  SOFT_LANDING_STORAGE_KEY,
  pickSoftLandingVariant,
  resolveSoftLandingVariant,
  getSoftLandingVariantConfig,
  normalizeSoftLandingPinVariant,
  parseSoftLandingPinRow,
} from './softLanding';
export {
  buildKasifQualityStats,
  isKasifIssueInteraction,
  pickSoftLandingWinner,
} from './qualityStats';
export {
  buildJobFunnelStats,
  highestFunnelStage,
  normalizeFunnel,
  KASIF_FUNNEL_STAGES,
} from './funnel';
export {
  buildJobReceipt,
  buildClientJobReceipt,
  buildJobReceiptSharePath,
  formatJobReceiptShareText,
} from './jobReceipt';
export {
  buildOpsDigestSnapshot,
  formatOpsDigestSubject,
  formatOpsDigestText,
  formatOpsDigestHtml,
  formatOpsDigestWowMetric,
  formatOpsDigestWowLines,
  normalizePartnerHealth,
  formatOpsDigestPartnerLines,
  isOpsDigestNotifyEnabled,
  OPS_DIGEST_HISTORY_KEY,
  OPS_DIGEST_HISTORY_MAX,
  buildOpsDigestHistorySummary,
  buildOpsDigestHistoryRecord,
  appendOpsDigestHistory,
  parseOpsDigestHistoryRow,
  buildOpsDigestWeekDelta,
  pickOpsDigestDeltaPair,
} from './opsDigest';
export {
  RECEIPT_SOCIAL_PROOF_MIN_VISIBLE,
  buildReceiptSocialProofStats,
  toPublicReceiptSocialProof,
} from './receiptSocialProof';

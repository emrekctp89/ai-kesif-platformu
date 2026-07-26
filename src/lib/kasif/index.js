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

import 'server-only';

export const kasifConfig = {
  enabled: process.env.KASIF_ENABLED !== 'false',
};

export function assertKasifEnabled() {
  if (!kasifConfig.enabled) {
    throw new Error('KASIF_DISABLED');
  }
}

import 'server-only';
import { isKasifEnabled as resolveKasifEnabled } from './activation';

export function isKasifEnabled(env = process.env) {
  return resolveKasifEnabled(env);
}

export const kasifConfig = {
  enabled: isKasifEnabled(process.env),
};

export function assertKasifEnabled() {
  if (!kasifConfig.enabled) {
    throw new Error('KASIF_DISABLED');
  }
}

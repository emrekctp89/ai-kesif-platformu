import {
  isSupportedCompletionPartner,
  sha256,
  signCompletionPayload,
  verifyCompletionSignature,
} from '@/lib/kasif/completionVerification';

describe('Kâşif completion verification', () => {
  it('allowlist dışındaki araçları reddeder', () => {
    expect(isSupportedCompletionPartner('hoppycopy')).toBe(true);
    expect(isSupportedCompletionPartner('unknown-tool')).toBe(false);
  });

  it('güncel ve doğru HMAC imzasını kabul eder', () => {
    const secret = 'a-secure-test-secret-that-is-long';
    const timestamp = '1785052800';
    const rawBody = '{"eventId":"evt_1"}';
    const signature = signCompletionPayload(secret, timestamp, rawBody);
    expect(
      verifyCompletionSignature({
        secret,
        timestamp,
        rawBody,
        signature: `sha256=${signature}`,
        now: Number(timestamp) * 1000,
      })
    ).toBe(true);
    expect(sha256('claim')).toHaveLength(64);
  });

  it('eski timestamp ve değiştirilmiş payloadı reddeder', () => {
    const secret = 'a-secure-test-secret-that-is-long';
    const timestamp = '1785052800';
    const signature = signCompletionPayload(secret, timestamp, '{}');
    expect(
      verifyCompletionSignature({
        secret,
        timestamp,
        rawBody: '{"changed":true}',
        signature,
        now: Number(timestamp) * 1000,
      })
    ).toBe(false);
    expect(
      verifyCompletionSignature({
        secret,
        timestamp,
        rawBody: '{}',
        signature,
        now: (Number(timestamp) + 301) * 1000,
      })
    ).toBe(false);
  });
});

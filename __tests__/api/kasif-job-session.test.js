const enforceRateLimit = jest.fn();
const assertKasifEnabled = jest.fn();
const createAdminClient = jest.fn();
const understandQuestion = jest.fn();
const seedFunnelFromResponse = jest.fn();
const applyFunnelStage = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, options = {}) => ({
      status: options.status || 200,
      json: async () => body,
    }),
  },
}));
jest.mock('@/utils/antiAbuse', () => ({
  enforceRateLimit: (...args) => enforceRateLimit(...args),
}));
jest.mock('@/lib/kasif/config', () => ({
  assertKasifEnabled: (...args) => assertKasifEnabled(...args),
}));
jest.mock('@/lib/kasif/engine', () => ({
  understandQuestion: (...args) => understandQuestion(...args),
}));
jest.mock('@/lib/kasif/funnel', () => ({
  seedFunnelFromResponse: (...args) => seedFunnelFromResponse(...args),
  applyFunnelStage: (...args) => applyFunnelStage(...args),
}));
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args) => createAdminClient(...args),
}));
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn() },
}));

import { POST } from '@/app/api/kasif/job-session/route';

function requestWith(body) {
  return { json: async () => body };
}

describe('Kâşif job-session API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true });
    understandQuestion.mockReturnValue({
      goals: ['presentation-creation'],
      concepts: [],
      pricePreference: 'any',
    });
    seedFunnelFromResponse.mockReturnValue({
      stages: { job_stated: '2026-07-25T10:00:00.000Z' },
      events: [],
    });
    applyFunnelStage.mockReturnValue({
      stages: { job_stated: '2026-07-25T10:00:00.000Z' },
      events: [],
    });
  });

  it('kısa promptu reddeder', async () => {
    const response = await POST(requestWith({ prompt: 'ab' }));
    expect(response.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('workmind oturumu için interaction oluşturur', async () => {
    createAdminClient.mockReturnValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'session-1' }, error: null }),
          }),
        }),
      }),
    });

    const response = await POST(
      requestWith({
        prompt: 'Ücretsiz sunum hazırlamak istiyorum',
        stepCount: 4,
        source: 'workmind',
        locale: 'tr',
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.interactionId).toBe('session-1');
    expect(body.feedbackToken).toBeTruthy();
    expect(body.goals).toContain('presentation-creation');
  });
});

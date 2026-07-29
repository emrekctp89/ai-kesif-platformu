const enforceRateLimit = jest.fn();
const assertKasifEnabled = jest.fn();
const createAdminClient = jest.fn();

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
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args) => createAdminClient(...args),
}));
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn() },
}));

import { POST } from '@/app/api/kasif/result-bridge/route';

function requestWith(body) {
  return { json: async () => body };
}

const emailBody = `Konu: İş birliği

Merhaba,
Ürünümüzü kısaca tanıtmak isteriz. 15 dakikalık bir görüşme uygun mu?
Saygılarımla
Ekip`;

describe('Kâşif result-bridge API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true });
  });

  it('geçersiz / kısa metni reddeder', async () => {
    const response = await POST(
      requestWith({
        interactionId: 'id',
        feedbackToken: 'tok',
        goal: 'email-writing',
        text: 'kısa',
      })
    );
    expect(response.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('yapıştırılan çıktıyı first_result olarak kaydeder', async () => {
    createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'id',
                  intent: { goals: ['email-writing'] },
                  funnel: {
                    stages: {
                      job_stated: '2026-07-25T10:00:00.000Z',
                      setup_started: '2026-07-25T10:05:00.000Z',
                    },
                    events: [],
                  },
                },
                error: null,
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'id',
                    funnel: {
                      stages: { first_result: '2026-07-25T10:20:00.000Z' },
                      result_artifact: { bridge: 'paste', goal: 'email-writing' },
                      events: [],
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const response = await POST(
      requestWith({
        interactionId: 'id',
        feedbackToken: 'tok',
        goal: 'email-writing',
        text: emailBody,
        locale: 'tr',
        markJobDone: true,
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.artifact.bridge).toBe('paste');
    expect(body.jobDone).toBe(true);
    expect(body.jobDoneVerified).toBe(false);
  });
});

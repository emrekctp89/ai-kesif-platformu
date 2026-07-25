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
  default: { error: jest.fn() },
}));

import { POST } from '@/app/api/kasif/funnel/route';

function requestWith(body) {
  return { json: async () => body };
}

describe('Kâşif funnel API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true });
  });

  it('geçersiz stage reddeder', async () => {
    const response = await POST(
      requestWith({
        interactionId: 'id',
        feedbackToken: 'token',
        stage: 'job_stated',
      })
    );
    expect(response.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('tool_selected aşamasını kaydeder', async () => {
    const maybeSingleRead = jest.fn().mockResolvedValue({
      data: {
        id: 'interaction-id',
        funnel: {
          stages: {
            job_stated: '2026-07-25T10:00:00.000Z',
            tool_recommended: '2026-07-25T10:00:00.000Z',
          },
          events: [],
        },
      },
      error: null,
    });
    const maybeSingleUpdate = jest.fn().mockResolvedValue({
      data: {
        id: 'interaction-id',
        funnel: {
          stages: {
            job_stated: '2026-07-25T10:00:00.000Z',
            tool_recommended: '2026-07-25T10:00:00.000Z',
            tool_selected: '2026-07-25T10:05:00.000Z',
          },
          selected_tool: { id: 'tool:1', title: 'Slayt AI' },
          events: [],
        },
      },
      error: null,
    });

    const selectUpdate = jest.fn(() => ({ maybeSingle: maybeSingleUpdate }));
    const eqTokenUpdate = jest.fn(() => ({ select: selectUpdate }));
    const eqIdUpdate = jest.fn(() => ({ eq: eqTokenUpdate }));
    const update = jest.fn(() => ({ eq: eqIdUpdate }));

    const selectRead = jest.fn(() => ({ maybeSingle: maybeSingleRead }));
    const eqTokenRead = jest.fn(() => ({ select: selectRead }));
    const eqIdRead = jest.fn(() => ({ eq: eqTokenRead }));
    const from = jest.fn(() => ({
      select: jest.fn(() => ({ eq: eqIdRead })),
      update,
    }));
    // Fix chain: select().eq().eq().maybeSingle
    from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: maybeSingleRead,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: maybeSingleUpdate,
            })),
          })),
        })),
      })),
    }));
    createAdminClient.mockReturnValue({ from });

    const response = await POST(
      requestWith({
        interactionId: 'interaction-id',
        feedbackToken: 'feedback-token',
        stage: 'tool_selected',
        selectedTool: { id: 'tool:1', title: 'Slayt AI' },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.funnel.stages.tool_selected).toBeTruthy();
  });

  it('bulunamayan etkileşimde 404 döner', async () => {
    createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    const response = await POST(
      requestWith({
        interactionId: 'missing',
        feedbackToken: 'token',
        stage: 'first_result',
        minutesToFirstResult: 12,
      })
    );
    expect(response.status).toBe(404);
  });
});

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

import { POST } from '@/app/api/kasif/feedback/route';

function requestWith(body) {
  return { json: async () => body };
}

function adminClientReturning(result) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ maybeSingle }));
  const is = jest.fn(() => ({ select }));
  const eqToken = jest.fn(() => ({ is }));
  const eqId = jest.fn(() => ({ eq: eqToken }));
  const update = jest.fn(() => ({ eq: eqId }));
  const from = jest.fn(() => ({ update }));
  createAdminClient.mockReturnValue({ from });
  return { from, update, eqId, eqToken, is, select, maybeSingle };
}

describe('Kâşif feedback API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true });
  });

  it('geçersiz geri bildirimi veritabanına dokunmadan reddeder', async () => {
    const response = await POST(
      requestWith({
        interactionId: 'interaction-id',
        feedbackToken: 'feedback-token',
        feedback: 0,
      })
    );

    expect(response.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('kimlik ve tek kullanımlık belirteç eşleştiğinde geri bildirimi kaydeder', async () => {
    const query = adminClientReturning({ data: { id: 'interaction-id' }, error: null });
    const response = await POST(
      requestWith({
        interactionId: 'interaction-id',
        feedbackToken: 'feedback-token',
        feedback: 1,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(query.eqId).toHaveBeenCalledWith('id', 'interaction-id');
    expect(query.eqToken).toHaveBeenCalledWith('feedback_token', 'feedback-token');
    expect(query.is).toHaveBeenCalledWith('feedback', null);
  });

  it('eşleşmeyen veya daha önce kullanılmış belirteci reddeder', async () => {
    adminClientReturning({ data: null, error: null });
    const response = await POST(
      requestWith({
        interactionId: 'interaction-id',
        feedbackToken: 'wrong-token',
        feedback: -1,
      })
    );

    expect(response.status).toBe(404);
  });
});

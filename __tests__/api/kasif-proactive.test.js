const createClient = jest.fn();
const createAdminClient = jest.fn();
const enforceRateLimit = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, options = {}) => ({
      status: options.status || 200,
      json: async () => body,
    }),
  },
}));
jest.mock('@/lib/kasif/config', () => ({ assertKasifEnabled: jest.fn() }));
jest.mock('@/utils/supabase/server', () => ({
  createClient: (...args) => createClient(...args),
}));
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args) => createAdminClient(...args),
}));
jest.mock('@/utils/antiAbuse', () => ({
  enforceRateLimit: (...args) => enforceRateLimit(...args),
}));

import { GET, POST } from '@/app/api/kasif/proactive/route';

function authenticatedAs(id = 'user-1') {
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id } } }) },
  });
}

describe('Kâşif proactive API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticatedAs();
    enforceRateLimit.mockResolvedValue({ allowed: true });
  });

  it('kişiselleştirme tercihini yalnız authenticated kullanıcı adına yazar', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    createAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ upsert }),
    });

    const response = await POST({
      json: async () => ({ personalizationEnabled: false }),
    });

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', enabled: false }),
      { onConflict: 'user_id' }
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      personalization: { enabled: false },
    });
  });

  it('opt-out kullanıcı için geçmiş veya katalog sorgulamaz', async () => {
    const preferenceQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { enabled: false, updated_at: '2026-07-31T10:00:00.000Z' },
        error: null,
      }),
    };
    preferenceQuery.select.mockReturnValue(preferenceQuery);
    preferenceQuery.eq.mockReturnValue(preferenceQuery);
    const from = jest.fn().mockReturnValue(preferenceQuery);
    createAdminClient.mockReturnValue({ from });

    const response = await GET({ url: 'http://localhost/api/kasif/proactive?locale=tr' });

    expect(from).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      suggestions: [],
      personalization: { enabled: false, available: true },
    });
  });

  it('shown event tekrarında timestamp güncellemeye izin verir', async () => {
    const ownershipQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'interaction-1' }, error: null }),
    };
    ownershipQuery.select.mockReturnValue(ownershipQuery);
    ownershipQuery.eq.mockReturnValue(ownershipQuery);
    const upsert = jest.fn().mockResolvedValue({ error: null });
    createAdminClient.mockReturnValue({
      from: jest.fn((table) => (table === 'kasif_interactions' ? ownershipQuery : { upsert })),
    });

    const response = await POST({
      json: async () => ({
        suggestionKey: 'interaction-1:new-tool',
        toolSlug: 'new-tool',
        interactionId: 'interaction-1',
        eventType: 'shown',
      }),
    });

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'shown', created_at: expect.any(String) }),
      expect.objectContaining({ ignoreDuplicates: false })
    );
  });
});

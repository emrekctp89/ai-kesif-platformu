const mockInsert = jest.fn();
const mockMaybeSingle = jest.fn();
const mockGetUser = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init = {}) => ({ body, status: init.status || 200 }),
  },
}));

jest.mock('@/utils/antiAbuse', () => ({
  enforceRateLimit: jest.fn(async () => ({ allowed: true })),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table) => {
      if (table === 'tools') {
        const builder = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: mockMaybeSingle,
        };
        return builder;
      }
      return { insert: mockInsert };
    },
  }),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

import { POST } from '../route';

describe('POST /api/outbound-click', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({
      data: { id: 42, link: 'https://example.com/product' },
      error: null,
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('validates the tool host and stores a privacy-safe click record', async () => {
    const response = await POST({
      json: async () => ({
        toolId: 42,
        destinationUrl: 'https://example.com/product?utm_source=aikesif#pricing',
        placement: 'hero',
        referrerPath: '/tool/example?tab=pricing',
        locale: 'tr',
      }),
    });

    expect(response.status).toBe(202);
    expect(mockInsert).toHaveBeenCalledWith({
      tool_id: 42,
      user_id: 'user-1',
      destination_url: 'https://example.com/product',
      placement: 'hero',
      referrer_path: '/tool/example?tab=pricing',
      locale: 'tr',
    });
  });

  it('rejects a destination that does not belong to the approved tool', async () => {
    const response = await POST({
      json: async () => ({
        toolId: 42,
        destinationUrl: 'https://attacker.example/product',
        placement: 'hero',
      }),
    });

    expect(response.status).toBe(404);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

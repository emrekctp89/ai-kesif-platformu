jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, options = {}) => ({
      status: options.status || 200,
      headers: {
        get: (name) =>
          Object.entries(options.headers || {}).find(
            ([key]) => key.toLowerCase() === String(name).toLowerCase()
          )?.[1] || null,
      },
      json: async () => body,
    }),
  },
}));

import { GET } from '@/app/api/kasif/status/route';

describe('GET /api/kasif/status', () => {
  it('public v2.1 capability manifestini secretsiz döndürür', async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      product: 'kasif',
      version: '2.1.1',
      guarantees: {
        catalogGrounded: true,
        scrapingApprovalRequired: true,
        automaticPublishing: false,
        paidProviderRequired: false,
      },
    });
    expect(body.capabilities.length).toBeGreaterThanOrEqual(10);
  });
});

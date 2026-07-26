/**
 * @jest-environment node
 */

import { buildLinkCheckUpdatePayload, clampInteger, normalizeUrl } from '@/lib/linkAuditCron';

describe('buildLinkCheckUpdatePayload', () => {
  const checkedAt = '2026-07-23T12:00:00.000Z';

  it('maps valid check results and clears deactivation fields', () => {
    const payload = buildLinkCheckUpdatePayload(
      {
        status: 'valid',
        errorDetail: null,
        httpStatus: 200,
        responseTimeMs: 120,
      },
      checkedAt
    );

    expect(payload).toEqual({
      link_check_status: 'valid',
      link_check_error: null,
      link_check_http_status: 200,
      link_response_time_ms: 120,
      link_checked_at: checkedAt,
      link_deactivated_at: null,
      link_deactivation_reason: null,
    });
  });

  it('maps invalid results without clearing deactivation unless valid/skipped', () => {
    const payload = buildLinkCheckUpdatePayload(
      {
        status: 'invalid',
        errorDetail: 'Sunucu 404 döndürdü.',
        httpStatus: 404,
        responseTimeMs: 40,
      },
      checkedAt
    );

    expect(payload).toEqual({
      link_check_status: 'invalid',
      link_check_error: 'Sunucu 404 döndürdü.',
      link_check_http_status: 404,
      link_response_time_ms: 40,
      link_checked_at: checkedAt,
    });
    expect(payload).not.toHaveProperty('link_deactivated_at');
  });

  it('treats skipped like valid for deactivation cleanup', () => {
    const payload = buildLinkCheckUpdatePayload(
      {
        status: 'skipped',
        errorDetail: 'test domaini atlandı',
        httpStatus: null,
        responseTimeMs: null,
      },
      checkedAt
    );

    expect(payload.link_check_status).toBe('skipped');
    expect(payload.link_deactivated_at).toBeNull();
    expect(payload.link_response_time_ms).toBeNull();
  });
});

describe('linkAuditCron helpers', () => {
  describe('clampInteger', () => {
    it('falls back and clamps bounds', () => {
      expect(clampInteger(undefined, { fallback: 7, min: 1, max: 90 })).toBe(7);
      expect(clampInteger('25', { fallback: 7, min: 1, max: 90 })).toBe(25);
      expect(clampInteger('0', { fallback: 7, min: 1, max: 90 })).toBe(1);
      expect(clampInteger('999', { fallback: 7, min: 1, max: 90 })).toBe(90);
      expect(clampInteger('nope', { fallback: 7, min: 1, max: 90 })).toBe(7);
    });
  });

  describe('normalizeUrl', () => {
    it('accepts http(s) only', () => {
      expect(normalizeUrl('https://example.com/ai').ok).toBe(true);
      expect(normalizeUrl('http://example.com').ok).toBe(true);
      expect(normalizeUrl('ftp://example.com').ok).toBe(false);
      expect(normalizeUrl('not a url').ok).toBe(false);
      expect(normalizeUrl('').ok).toBe(false);
    });
  });
});

describe('getDueTools prioritization', () => {
  function createMockAdmin(queues) {
    const calls = [];

    const makeBuilder = (rows) => {
      const builder = {
        _rows: rows,
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        not() {
          return builder;
        },
        is() {
          return builder;
        },
        in() {
          return builder;
        },
        lt() {
          return builder;
        },
        order() {
          return builder;
        },
        async limit(n) {
          calls.push({ n, size: builder._rows.length });
          return { data: builder._rows.slice(0, n), error: null };
        },
      };
      return builder;
    };

    // Sequence of .from('tools') responses
    let idx = 0;
    return {
      calls,
      client: {
        from(table) {
          if (table !== 'tools') throw new Error(`unexpected table ${table}`);
          const rows = queues[idx] || [];
          idx += 1;
          return makeBuilder(rows);
        },
      },
    };
  }

  it('prefers never-checked tools, then problems, then stale (all mode)', async () => {
    jest.resetModules();
    const { getDueTools } = await import('@/lib/linkAuditCron');

    const neverChecked = [
      { id: 1, name: 'New A', slug: 'new-a', link: 'https://a.test', link_checked_at: null },
      { id: 2, name: 'New B', slug: 'new-b', link: 'https://b.test', link_checked_at: null },
    ];
    const problems = [
      {
        id: 3,
        name: 'Broken',
        slug: 'broken',
        link: 'https://c.test',
        link_check_status: 'invalid',
        link_checked_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    const stale = [
      {
        id: 4,
        name: 'Stale',
        slug: 'stale',
        link: 'https://d.test',
        link_check_status: 'valid',
        link_checked_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const mock = createMockAdmin([neverChecked, problems, stale]);
    const due = await getDueTools(mock.client, {
      limit: 10,
      staleBefore: '2026-07-01T00:00:00.000Z',
      priority: 'all',
    });

    expect(due.map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });

  it('stops after never-checked + problems in pending mode', async () => {
    jest.resetModules();
    const { getDueTools } = await import('@/lib/linkAuditCron');

    const neverChecked = [
      { id: 1, name: 'New A', slug: 'new-a', link: 'https://a.test', link_checked_at: null },
    ];
    const problems = [
      {
        id: 3,
        name: 'Broken',
        slug: 'broken',
        link: 'https://c.test',
        link_check_status: 'review',
        link_checked_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    // stale queue should not be requested when limit filled? limit=2 fills after problems
    // with limit=5, pending should not call stale query - only 2 queries
    const mock = createMockAdmin([neverChecked, problems, [{ id: 99 }]]);
    const due = await getDueTools(mock.client, {
      limit: 5,
      staleBefore: '2026-07-01T00:00:00.000Z',
      priority: 'pending',
    });

    expect(due.map((t) => t.id)).toEqual([1, 3]);
    // only two from() calls for pending (never + problems)
    expect(mock.calls.length).toBe(2);
  });
});

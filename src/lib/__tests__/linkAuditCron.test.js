const { buildLinkCheckUpdatePayload } = require('../linkAuditCron');

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

import {
  clampScrapeQuota,
  clampScrapeRetries,
  isRetryableScrapeFailure,
  runScheduledScrapeQueue,
} from '@/lib/toolScrape/scheduler';

describe('scheduled tool scrape queue', () => {
  it('kota ve retry sınırlarını güvenli aralıkta tutar', () => {
    expect(clampScrapeQuota(999)).toBe(10);
    expect(clampScrapeQuota(0)).toBe(1);
    expect(clampScrapeRetries(999)).toBe(2);
    expect(clampScrapeRetries(-1)).toBe(0);
  });

  it('yalnızca geçici ağ ve servis hatalarını retry eder', () => {
    expect(isRetryableScrapeFailure({ ok: false, attempts: [{ httpStatus: 429 }] })).toBe(true);
    expect(isRetryableScrapeFailure({ ok: false, error: 'fetch failed: ECONNRESET' })).toBe(true);
    expect(isRetryableScrapeFailure({ ok: false, attempts: [{ httpStatus: 404 }] })).toBe(false);
    expect(isRetryableScrapeFailure({ ok: false, error: 'Geçersiz URL.' })).toBe(false);
  });

  it('geçici hatayı retry edip adayı rapora ekler', async () => {
    const scrape = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: 'timeout',
        attempts: [{ provider: 'native', error: 'timeout' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        provider: 'native',
        attempts: [{ provider: 'native', ok: true, httpStatus: 200 }],
        candidate: {
          name: 'Yeni Araç',
          link: 'https://new-tool.ai/',
          description: 'Yeni araç için yeterince uzun ve anlamlı bir açıklama metni.',
        },
      });

    const report = await runScheduledScrapeQueue({
      categorySlug: 'all',
      limit: 1,
      quota: 1,
      retries: 1,
      catalogTools: [],
      scrape,
      delay: async () => {},
    });

    expect(scrape).toHaveBeenCalledTimes(2);
    expect(report).toMatchObject({
      processedCount: 1,
      candidateCount: 1,
      failureCount: 0,
      retryCount: 1,
      quota: { limit: 1, used: 1, remaining: 0, providerAttempts: 2 },
    });
    expect(report.candidates[0].name).toBe('Yeni Araç');
  });

  it('kalıcı hatayı retry etmeden hata özetine taşır', async () => {
    const scrape = jest.fn().mockResolvedValue({
      ok: false,
      error: 'native HTTP 404',
      attempts: [{ provider: 'native', ok: false, httpStatus: 404 }],
    });

    const report = await runScheduledScrapeQueue({
      limit: 1,
      quota: 1,
      retries: 2,
      catalogTools: [],
      scrape,
      delay: async () => {},
    });

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(report.failureCount).toBe(1);
    expect(report.retryCount).toBe(0);
  });
});

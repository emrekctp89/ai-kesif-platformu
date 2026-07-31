/** @jest-environment node */
jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/utils/gemini', () => ({ embedGeminiText: jest.fn() }));

import { createAdminClient } from '@/utils/supabase/admin';
import { embedGeminiText } from '@/utils/gemini';
import { getToolEmbeddingCoverage, refreshMissingToolEmbeddings } from '@/lib/toolEmbeddings';

describe('toolEmbeddings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('yalnızca eksik embeddingleri günceller', async () => {
    const fetchQuery = {};
    for (const method of ['select', 'eq', 'is', 'order']) {
      fetchQuery[method] = jest.fn().mockReturnValue(fetchQuery);
    }
    fetchQuery.limit = jest.fn().mockResolvedValue({
      data: [{ id: 7, name: 'Tool', description: 'Desc' }],
      error: null,
    });
    const updateQuery = {
      update: jest.fn(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    updateQuery.update.mockReturnValue(updateQuery);
    createAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValueOnce(fetchQuery).mockReturnValueOnce(updateQuery),
    });
    embedGeminiText.mockResolvedValue([0.1, 0.2]);

    await expect(refreshMissingToolEmbeddings({ limit: 10 })).resolves.toMatchObject({
      scanned: 1,
      updated: 1,
      failed: 0,
      hasMore: false,
      limit: 10,
    });
    expect(fetchQuery.is).toHaveBeenCalledWith('embedding', null);
    expect(embedGeminiText).toHaveBeenCalledWith('Tool. Desc');
  });

  it('limit ve delayMs değerlerini güvenli aralığa sıkıştırır', async () => {
    const fetchQuery = {};
    for (const method of ['select', 'eq', 'is', 'order']) {
      fetchQuery[method] = jest.fn().mockReturnValue(fetchQuery);
    }
    fetchQuery.limit = jest.fn().mockResolvedValue({ data: [], error: null });
    createAdminClient.mockReturnValue({ from: jest.fn().mockReturnValue(fetchQuery) });

    const report = await refreshMissingToolEmbeddings({ limit: 9999, delayMs: -5 });
    expect(fetchQuery.limit).toHaveBeenCalledWith(200);
    expect(report.limit).toBe(200);
    expect(report.delayMs).toBe(0);
  });

  it('coverage özetini approved / missing sayımlarından üretir', async () => {
    const approvedChain = {
      select: jest.fn(),
      eq: jest.fn(),
    };
    approvedChain.select.mockReturnValue(approvedChain);
    approvedChain.eq.mockResolvedValue({ count: 467, error: null });

    const missingChain = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
    };
    missingChain.select.mockReturnValue(missingChain);
    missingChain.eq.mockReturnValue(missingChain);
    missingChain.is.mockResolvedValue({ count: 467, error: null });

    createAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValueOnce(approvedChain).mockReturnValueOnce(missingChain),
    });

    await expect(getToolEmbeddingCoverage()).resolves.toEqual({
      approved: 467,
      withEmbedding: 0,
      missing: 467,
      coveragePct: 0,
      readyForVectorFallback: false,
    });
  });

  it('includeCoverage ile before/after raporu ekler', async () => {
    const approvedBefore = { select: jest.fn(), eq: jest.fn() };
    approvedBefore.select.mockReturnValue(approvedBefore);
    approvedBefore.eq.mockResolvedValue({ count: 10, error: null });
    const missingBefore = { select: jest.fn(), eq: jest.fn(), is: jest.fn() };
    missingBefore.select.mockReturnValue(missingBefore);
    missingBefore.eq.mockReturnValue(missingBefore);
    missingBefore.is.mockResolvedValue({ count: 2, error: null });

    const fetchQuery = {};
    for (const method of ['select', 'eq', 'is', 'order']) {
      fetchQuery[method] = jest.fn().mockReturnValue(fetchQuery);
    }
    fetchQuery.limit = jest.fn().mockResolvedValue({
      data: [{ id: 1, name: 'A', description: 'd' }],
      error: null,
    });
    const updateQuery = {
      update: jest.fn(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    updateQuery.update.mockReturnValue(updateQuery);

    const approvedAfter = { select: jest.fn(), eq: jest.fn() };
    approvedAfter.select.mockReturnValue(approvedAfter);
    approvedAfter.eq.mockResolvedValue({ count: 10, error: null });
    const missingAfter = { select: jest.fn(), eq: jest.fn(), is: jest.fn() };
    missingAfter.select.mockReturnValue(missingAfter);
    missingAfter.eq.mockReturnValue(missingAfter);
    missingAfter.is.mockResolvedValue({ count: 1, error: null });

    createAdminClient.mockReturnValue({
      from: jest
        .fn()
        .mockReturnValueOnce(approvedBefore)
        .mockReturnValueOnce(missingBefore)
        .mockReturnValueOnce(fetchQuery)
        .mockReturnValueOnce(updateQuery)
        .mockReturnValueOnce(approvedAfter)
        .mockReturnValueOnce(missingAfter),
    });
    embedGeminiText.mockResolvedValue(Array.from({ length: 2 }, () => 0.1));

    const report = await refreshMissingToolEmbeddings({
      limit: 5,
      includeCoverage: true,
    });

    expect(report.coverageBefore).toMatchObject({
      approved: 10,
      missing: 2,
      coveragePct: 80,
      readyForVectorFallback: false,
    });
    expect(report.coverageAfter).toMatchObject({
      approved: 10,
      missing: 1,
      coveragePct: 90,
    });
    expect(report.updated).toBe(1);
  });
});

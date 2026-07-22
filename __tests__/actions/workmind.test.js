jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/utils/antiAbuse', () => ({
  enforceRateLimit: jest.fn(),
}));
jest.mock('@/lib/kasif/integrations', () => ({
  getKasifWorkmindRecommendations: jest.fn(),
}));
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { getWorkmindToolRecommendations } from '@/app/actions/workmind';
import { getKasifWorkmindRecommendations } from '@/lib/kasif/integrations';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { createClient } from '@/utils/supabase/server';

function createCategoryFallbackClient(tools = []) {
  const categoryQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { id: 7 } }),
  };
  const toolsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: tools, error: null }),
  };

  return {
    from: jest.fn((table) => (table === 'categories' ? categoryQuery : toolsQuery)),
  };
}

describe('Workmind tool recommendation action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it('returns contextual Kasif recommendations before querying the category fallback', async () => {
    const client = createCategoryFallbackClient();
    createClient.mockResolvedValue(client);
    getKasifWorkmindRecommendations.mockResolvedValue([{ id: 1, name: 'Deck AI' }]);

    const result = await getWorkmindToolRecommendations(' sunum ', {
      goal: ' Launch plan ',
      label: ' Create slides ',
      description: ' Present the product ',
    });

    expect(result).toEqual({ tools: [{ id: 1, name: 'Deck AI' }], source: 'kasif' });
    expect(getKasifWorkmindRecommendations).toHaveBeenCalledWith(
      {
        goal: 'Launch plan',
        label: 'Create slides',
        description: 'Present the product',
        categorySlug: 'sunum',
      },
      4
    );
    expect(client.from).not.toHaveBeenCalled();
  });

  it('uses approved category tools when the rate limit is exhausted', async () => {
    const fallbackTools = [{ id: 2, name: 'Category Tool' }];
    const client = createCategoryFallbackClient(fallbackTools);
    createClient.mockResolvedValue(client);
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });

    const result = await getWorkmindToolRecommendations('sunum', {
      label: 'Create slides',
    });

    expect(result).toEqual({ tools: fallbackTools, source: 'category' });
    expect(getKasifWorkmindRecommendations).not.toHaveBeenCalled();
    expect(client.from).toHaveBeenCalledWith('categories');
    expect(client.from).toHaveBeenCalledWith('tools');
  });

  it('uses the category fallback when Kasif returns no results', async () => {
    const fallbackTools = [{ id: 3, name: 'Fallback Tool' }];
    createClient.mockResolvedValue(createCategoryFallbackClient(fallbackTools));
    getKasifWorkmindRecommendations.mockResolvedValue([]);

    await expect(
      getWorkmindToolRecommendations('sunum', { description: 'Build a customer deck' })
    ).resolves.toEqual({ tools: fallbackTools, source: 'category' });
  });
});

import { runGlobalSearch } from '../globalSearch';
import { runAdvancedOmniSearch } from '../ai';
import { createClient } from '@/utils/supabase/actions';

jest.mock('../ai', () => ({ runAdvancedOmniSearch: jest.fn() }));
jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('@/utils/logger', () => ({ error: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

function mockDatabase(response) {
  const responses = response.tools || response.posts ? response : { tools: response };
  const builders = Object.fromEntries(
    ['tools', 'posts'].map((table) => {
      const builder = {};
      for (const method of ['select', 'eq', 'ilike', 'order']) {
        builder[method] = jest.fn(() => builder);
      }
      builder.limit = jest.fn().mockResolvedValue(responses[table] || { data: [] });
      return [table, builder];
    })
  );
  createClient.mockResolvedValue({ from: jest.fn((table) => builders[table]) });
  return builders;
}

it('keeps semantic results when the primary search works', async () => {
  const response = { results: [{ title: 'Midjourney' }], suggestions: [] };
  runAdvancedOmniSearch.mockResolvedValue(response);
  expect(await runGlobalSearch('resim oluştur')).toEqual(response);
  expect(createClient).not.toHaveBeenCalled();
});

it('falls back to approved tool names when semantic search fails', async () => {
  runAdvancedOmniSearch.mockResolvedValue({ error: 'provider unavailable' });
  const { tools: database } = mockDatabase({
    data: [{ name: 'ChatGPT', slug: 'chatgpt', description: 'AI assistant' }],
  });
  const response = await runGlobalSearch(' ChatGPT ');
  expect(database.eq).toHaveBeenCalledWith('is_approved', true);
  expect(database.ilike).toHaveBeenCalledWith('name', '%ChatGPT%');
  expect(response.results[0]).toMatchObject({
    title: 'ChatGPT',
    url: '/tool/chatgpt',
    result_type: 'Tool',
  });
  expect(response.error).toBeUndefined();
});

it('escapes wildcard characters and handles a rejected primary request', async () => {
  runAdvancedOmniSearch.mockRejectedValue(new Error('offline'));
  const { tools: database } = mockDatabase({ data: [] });
  expect(await runGlobalSearch('100%_')).toEqual({ results: [], suggestions: [] });
  expect(database.ilike).toHaveBeenCalledWith('name', '%100\\%\\_%');
});

it('returns published posts after tools when semantic search is unavailable', async () => {
  runAdvancedOmniSearch.mockResolvedValue({ error: 'provider unavailable' });
  const { tools, posts } = mockDatabase({
    tools: {
      data: [{ name: 'ChatGPT', slug: 'chatgpt', description: 'AI assistant' }],
    },
    posts: {
      data: [{ title: 'ChatGPT rehberi', slug: 'chatgpt-guide', description: 'Nasıl kullanılır?' }],
    },
  });

  const response = await runGlobalSearch('ChatGPT');

  expect(posts.eq).toHaveBeenCalledWith('status', 'Yayınlandı');
  expect(posts.ilike).toHaveBeenCalledWith('title', '%ChatGPT%');
  expect(response.results.map((result) => result.result_type)).toEqual(['Tool', 'Post']);
  expect(response.results[1].url).toBe('/blog/chatgpt-guide');
  expect(tools.eq).toHaveBeenCalledWith('is_approved', true);
});

it('returns a retryable error when both searches fail', async () => {
  runAdvancedOmniSearch.mockResolvedValue({ error: 'unavailable' });
  mockDatabase({
    tools: { error: { message: 'tools unavailable' } },
    posts: { error: { message: 'posts unavailable' } },
  });
  expect((await runGlobalSearch('ChatGPT')).error).toBe(
    'Arama tamamlanamadı. Lütfen tekrar deneyin.'
  );
});

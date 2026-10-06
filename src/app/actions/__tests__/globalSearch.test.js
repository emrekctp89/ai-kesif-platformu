import { runGlobalSearch } from '../globalSearch';
import { rankTools, understandQuestion } from '@/lib/kasif/engine';
import { expandSearchTerms } from '@/lib/kasif/retrieval';
import { createClient } from '@/utils/supabase/actions';

jest.mock('@/lib/kasif/engine', () => ({
  rankTools: jest.fn((records) => records.map((record) => ({ record }))),
  understandQuestion: jest.fn(() => ({ tokens: [], signals: [], goals: [] })),
}));
jest.mock('@/lib/kasif/retrieval', () => ({ expandSearchTerms: jest.fn(() => []) }));
jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('@/utils/logger', () => ({ error: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  rankTools.mockImplementation((records) => records.map((record) => ({ record })));
  understandQuestion.mockReturnValue({ tokens: [], signals: [], goals: [] });
  expandSearchTerms.mockReturnValue([]);
});

function mockDatabase(response) {
  const responses = response.tools || response.posts ? response : { tools: response };
  const builders = Object.fromEntries(
    ['tools_with_ratings', 'posts'].map((table) => {
      const builder = {};
      for (const method of ['select', 'eq', 'or', 'order']) {
        builder[method] = jest.fn(() => builder);
      }
      const responseKey = table === 'tools_with_ratings' ? 'tools' : table;
      builder.limit = jest.fn().mockResolvedValue(responses[responseKey] || { data: [] });
      return [table, builder];
    })
  );
  createClient.mockResolvedValue({ from: jest.fn((table) => builders[table]) });
  return builders;
}

it('uses Kâşif local intent and ranking for approved tool suggestions', async () => {
  const { tools_with_ratings: tools } = mockDatabase({
    tools: {
      data: [
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          description: 'AI assistant',
          category_name: 'Chatbot',
        },
      ],
    },
    posts: { data: [] },
  });

  const response = await runGlobalSearch(' ChatGPT ');

  expect(understandQuestion).toHaveBeenCalledWith('ChatGPT');
  expect(expandSearchTerms).toHaveBeenCalledWith('ChatGPT');
  expect(tools.eq).toHaveBeenCalledWith('is_approved', true);
  expect(tools.or).toHaveBeenCalledWith(expect.stringContaining('name.ilike.%ChatGPT%'));
  expect(rankTools).toHaveBeenCalledWith(
    [expect.objectContaining({ name: 'ChatGPT', category: { name: 'Chatbot' } })],
    expect.any(Object),
    10
  );
  expect(response.results[0]).toMatchObject({
    title: 'ChatGPT',
    url: '/tool/chatgpt',
    result_type: 'Tool',
  });
});

it('strips wildcard syntax from local database search filters', async () => {
  const { tools_with_ratings: tools } = mockDatabase({ data: [] });

  expect(await runGlobalSearch('100%_')).toEqual({ results: [], suggestions: [] });
  expect(tools.or).toHaveBeenCalledWith(expect.stringContaining('name.ilike.%100%'));
  expect(tools.or.mock.calls[0][0]).not.toMatch(/%100_%/);
});

it('returns published posts after tools using Kâşif-expanded terms', async () => {
  expandSearchTerms.mockReturnValue(['ChatGPT', 'assistant']);
  const { tools_with_ratings: tools, posts } = mockDatabase({
    tools: {
      data: [{ name: 'ChatGPT', slug: 'chatgpt', description: 'AI assistant' }],
    },
    posts: {
      data: [{ title: 'ChatGPT rehberi', slug: 'chatgpt-guide', description: 'Nasıl kullanılır?' }],
    },
  });

  const response = await runGlobalSearch('ChatGPT');
  expect(posts.eq).toHaveBeenCalledWith('status', 'Yayınlandı');
  expect(posts.or).toHaveBeenCalledWith(expect.stringContaining('title.ilike.%assistant%'));
  expect(response.results.map((result) => result.result_type)).toEqual(['Tool', 'Post']);
  expect(response.results[1].url).toBe('/blog/chatgpt-guide');
  expect(tools.eq).toHaveBeenCalledWith('is_approved', true);
});

it('returns a retryable error when local content queries fail', async () => {
  mockDatabase({
    tools: { error: { message: 'tools unavailable' } },
    posts: { error: { message: 'posts unavailable' } },
  });
  expect((await runGlobalSearch('ChatGPT')).error).toBe(
    'Arama tamamlanamadı. Lütfen tekrar deneyin.'
  );
});

import { runGlobalSearch } from '../globalSearch';
import { runAdvancedOmniSearch } from '../ai';
import { createClient } from '@/utils/supabase/actions';

jest.mock('../ai', () => ({ runAdvancedOmniSearch: jest.fn() }));
jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('@/utils/logger', () => ({ error: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

function mockDatabase(response) {
  const builder = {};
  for (const method of ['from', 'select', 'eq', 'ilike', 'order']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.limit = jest.fn().mockResolvedValue(response);
  createClient.mockResolvedValue(builder);
  return builder;
}

it('keeps semantic results when the primary search works', async () => {
  const response = { results: [{ title: 'Midjourney' }], suggestions: [] };
  runAdvancedOmniSearch.mockResolvedValue(response);
  expect(await runGlobalSearch('resim oluştur')).toEqual(response);
  expect(createClient).not.toHaveBeenCalled();
});

it('falls back to approved tool names when semantic search fails', async () => {
  runAdvancedOmniSearch.mockResolvedValue({ error: 'provider unavailable' });
  const database = mockDatabase({
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
  const database = mockDatabase({ data: [] });
  expect(await runGlobalSearch('100%_')).toEqual({ results: [], suggestions: [] });
  expect(database.ilike).toHaveBeenCalledWith('name', '%100\\%\\_%');
});

it('returns a retryable error when both searches fail', async () => {
  runAdvancedOmniSearch.mockResolvedValue({ error: 'unavailable' });
  mockDatabase({ error: { message: 'database unavailable' } });
  expect((await runGlobalSearch('ChatGPT')).error).toBe(
    'Arama tamamlanamadı. Lütfen tekrar deneyin.'
  );
});

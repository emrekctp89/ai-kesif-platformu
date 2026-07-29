/** @jest-environment node */
jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/utils/gemini', () => ({ embedGeminiText: jest.fn() }));
import { createAdminClient } from '@/utils/supabase/admin';
import { embedGeminiText } from '@/utils/gemini';
import { refreshMissingToolEmbeddings } from '@/lib/toolEmbeddings';

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
  });
  expect(fetchQuery.is).toHaveBeenCalledWith('embedding', null);
});

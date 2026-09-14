import { createClient } from '@/utils/supabase/actions';
import {
  deleteProject,
  getAiProjectStrategy,
  updateProject,
  updateProjectItems,
} from '../projects';

jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/utils/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));

function form(values) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function createSupabase({ user = null, project = null } = {}) {
  const ownerQuery = {
    select: jest.fn(() => ownerQuery),
    eq: jest.fn(() => ownerQuery),
    maybeSingle: jest.fn(async () => ({ data: project, error: null })),
  };
  const from = jest.fn(() => ownerQuery);
  return {
    auth: { getUser: jest.fn(async () => ({ data: { user } })) },
    from,
    rpc: jest.fn(),
    ownerQuery,
  };
}

describe('project action authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['update', () => updateProject(form({ id: 'p1', title: 'Başlık', description: '' }))],
    ['delete', () => deleteProject(form({ id: 'p1' }))],
    ['items', () => updateProjectItems(form({ projectId: 'p1', items: '[]' }))],
    ['AI strategy', () => getAiProjectStrategy('p1')],
  ])('rejects unauthenticated %s before querying project data', async (_, action) => {
    const supabase = createSupabase();
    createClient.mockResolvedValue(supabase);

    await expect(action()).resolves.toEqual({ error: 'Bu işlem için giriş yapmalısınız.' });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['update', () => updateProject(form({ id: 'foreign', title: 'Başlık', description: '' }))],
    ['delete', () => deleteProject(form({ id: 'foreign' }))],
    ['items', () => updateProjectItems(form({ projectId: 'foreign', items: '[]' }))],
    ['AI strategy', () => getAiProjectStrategy('foreign')],
  ])('rejects %s for a project the user does not own', async (_, action) => {
    const supabase = createSupabase({ user: { id: 'user-1' }, project: null });
    createClient.mockResolvedValue(supabase);

    await expect(action()).resolves.toEqual({
      error: 'Proje bulunamadı veya bu işlem için yetkiniz yok.',
    });
    expect(supabase.ownerQuery.eq).toHaveBeenCalledWith('id', 'foreign');
    expect(supabase.ownerQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed project items before deleting existing items', async () => {
    const supabase = createSupabase({ user: { id: 'user-1' }, project: { id: 'p1' } });
    createClient.mockResolvedValue(supabase);

    await expect(updateProjectItems(form({ projectId: 'p1', items: '{bad' }))).resolves.toEqual({
      error: 'Proje içerikleri geçerli bir formatta değil.',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

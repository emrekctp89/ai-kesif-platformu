import { createClient } from '@/utils/supabase/actions';
import { markConversationAsRead, searchUsers, sendMessage } from '../messages';

jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/utils/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));

function messageForm() {
  const data = new FormData();
  data.set('conversationId', 'foreign-conversation');
  data.set('content', 'Merhaba');
  return data;
}

function createSupabase({ user = { id: 'user-1' }, participant = null } = {}) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    maybeSingle: jest.fn(async () => ({ data: participant, error: null })),
  };
  return {
    auth: { getUser: jest.fn(async () => ({ data: { user } })) },
    from: jest.fn(() => query),
    rpc: jest.fn(),
    query,
  };
}

describe('message action authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not let a non-participant send a message', async () => {
    const supabase = createSupabase();
    createClient.mockResolvedValue(supabase);

    await expect(sendMessage(messageForm())).resolves.toEqual({
      error: 'Sohbet bulunamadı veya bu işlem için yetkiniz yok.',
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('conversation_participants');
    expect(supabase.query.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('does not let a non-participant mark a conversation as read', async () => {
    const supabase = createSupabase();
    createClient.mockResolvedValue(supabase);

    await expect(markConversationAsRead('foreign-conversation')).resolves.toEqual({
      error: 'Sohbet bulunamadı veya bu işlem için yetkiniz yok.',
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects short searches before querying profiles', async () => {
    const supabase = createSupabase();
    createClient.mockResolvedValue(supabase);

    await expect(searchUsers('%')).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

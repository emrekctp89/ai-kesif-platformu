import {
  authorDisplayName,
  attachRelatedToolsToPosts,
  collectTagsFromPosts,
  getPublishedPostsByAuthor,
  getPublishedPostsForTool,
} from '@/lib/contentAuthors';

describe('authorDisplayName', () => {
  it('prefers profile username', () => {
    expect(
      authorDisplayName({ author: { username: 'inventor' }, author_name: 'Legacy' }, 'Fallback')
    ).toBe('inventor');
  });

  it('falls back to author_name then default', () => {
    expect(authorDisplayName({ author: null, author_name: 'Editör' }, 'AI')).toBe('Editör');
    expect(authorDisplayName({}, 'AI Keşif')).toBe('AI Keşif');
  });
});

describe('collectTagsFromPosts', () => {
  it('dedupes tags across posts', () => {
    const tags = collectTagsFromPosts([
      {
        tags: [
          { id: 1, name: 'AI' },
          { id: 2, name: 'Guide' },
        ],
      },
      {
        tags: [
          { id: 1, name: 'AI' },
          { id: 3, name: 'Tools' },
        ],
      },
    ]);
    expect(tags.map((t) => t.id).sort()).toEqual([1, 2, 3]);
  });
});

function mockSupabase(result) {
  const chain = {
    select: jest.fn(() => chain),
    in: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(result)),
  };
  // attachRelatedToolsToPosts ends with .in() which may return the promise
  chain.in = jest.fn(() => Promise.resolve(result));
  return {
    from: jest.fn(() => chain),
    _chain: chain,
  };
}

describe('attachRelatedToolsToPosts', () => {
  it('returns empty relatedTools for empty list', async () => {
    const supabase = mockSupabase({ data: [], error: null });
    const out = await attachRelatedToolsToPosts(supabase, []);
    expect(out).toEqual([]);
  });

  it('maps tools onto posts by post_id', async () => {
    const supabase = mockSupabase({
      data: [
        {
          post_id: 1,
          tool_id: 10,
          tools: { id: 10, name: 'ChatGPT', slug: 'chatgpt', description: 'x' },
        },
        {
          post_id: 1,
          tool_id: 11,
          tools: { id: 11, name: 'Claude', slug: 'claude', description: 'y' },
        },
        {
          post_id: 2,
          tool_id: 10,
          tools: { id: 10, name: 'ChatGPT', slug: 'chatgpt', description: 'x' },
        },
      ],
      error: null,
    });
    const out = await attachRelatedToolsToPosts(supabase, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(out[0].relatedTools).toHaveLength(2);
    expect(out[0].relatedTools[0].slug).toBe('chatgpt');
    expect(out[1].relatedTools).toHaveLength(1);
    expect(out[2].relatedTools).toEqual([]);
  });

  it('skips tools without slug', async () => {
    const supabase = mockSupabase({
      data: [{ post_id: 1, tool_id: 9, tools: { id: 9, name: 'NoSlug', slug: null } }],
      error: null,
    });
    const out = await attachRelatedToolsToPosts(supabase, [{ id: 1 }]);
    expect(out[0].relatedTools).toEqual([]);
  });
});

describe('getPublishedPostsByAuthor', () => {
  it('returns empty without authorId', async () => {
    const supabase = { from: jest.fn() };
    expect(await getPublishedPostsByAuthor(supabase, null)).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('queries published posts ordered by date', async () => {
    const rows = [{ id: 1, title: 'Hello', slug: 'hello', type: 'Yazı' }];
    const supabase = mockSupabase({ data: rows, error: null });
    // getPublishedPostsByAuthor uses .limit() as terminal
    supabase._chain.in = jest.fn(() => supabase._chain);
    supabase._chain.limit = jest.fn(() => Promise.resolve({ data: rows, error: null }));
    const out = await getPublishedPostsByAuthor(supabase, 'user-1', { limit: 3 });
    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(supabase._chain.eq).toHaveBeenCalledWith('author_id', 'user-1');
    expect(supabase._chain.eq).toHaveBeenCalledWith('status', 'Yayınlandı');
    expect(out).toEqual(rows);
  });
});

describe('getPublishedPostsForTool', () => {
  it('returns empty without toolId', async () => {
    const supabase = { from: jest.fn() };
    expect(await getPublishedPostsForTool(supabase, null)).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns empty when no post_tools links', async () => {
    const supabase = mockSupabase({ data: [], error: null });
    supabase._chain.limit = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const out = await getPublishedPostsForTool(supabase, 42);
    expect(supabase.from).toHaveBeenCalledWith('post_tools');
    expect(out).toEqual([]);
  });

  it('loads published posts for linked tool ids', async () => {
    const posts = [{ id: 7, title: 'Guide', slug: 'guide', type: 'Rehber' }];
    let fromCalls = 0;
    const chain = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      in: jest.fn(() => chain),
      order: jest.fn(() => chain),
      limit: jest.fn(() => {
        fromCalls += 1;
        if (fromCalls === 1) {
          return Promise.resolve({ data: [{ post_id: 7 }, { post_id: 7 }], error: null });
        }
        return Promise.resolve({ data: posts, error: null });
      }),
    };
    const supabase = { from: jest.fn(() => chain) };
    const out = await getPublishedPostsForTool(supabase, 99, { limit: 4 });
    expect(supabase.from).toHaveBeenCalledWith('post_tools');
    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(out).toEqual(posts);
  });
});

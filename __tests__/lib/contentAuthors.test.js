import { authorDisplayName, collectTagsFromPosts } from '@/lib/contentAuthors';

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

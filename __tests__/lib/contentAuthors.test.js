import { authorDisplayName } from '@/lib/contentAuthors';

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

import { fireEvent, render, screen } from '@testing-library/react';
import { BlogListingClient } from '../BlogListingClient';

jest.mock('next-intl', () => ({ useTranslations: () => (key) => key }));
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, prefetch: _prefetch, ...props }) => <a {...props}>{children}</a>,
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, priority: _priority, ...props }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

it('keeps the article available after a cover fails and tries a replacement cover', () => {
  const post = {
    slug: 'example',
    title: 'Örnek yazı',
    featured_image_url: 'https://example.com/broken.jpg',
  };
  const { rerender } = render(<BlogListingClient posts={[post]} locale="tr" />);
  fireEvent.error(screen.getByRole('img', { name: 'Örnek yazı' }));
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Örnek yazı/ })).toHaveAttribute('href', '/blog/example');
  rerender(
    <BlogListingClient
      posts={[{ ...post, featured_image_url: 'https://example.com/fixed.jpg' }]}
      locale="tr"
    />
  );
  expect(screen.getByRole('img', { name: 'Örnek yazı' })).toHaveAttribute(
    'src',
    'https://example.com/fixed.jpg'
  );
});

const posts = [
  { slug: 'guide', title: 'Yapay zekâ rehberi', type: 'Rehber', author: { username: 'Çağrı' } },
  { slug: 'article', title: 'Görsel üretim', type: 'Yazı', author_name: 'Deniz' },
];

it('supports arrow and Home keys for filter tabs with matching result panels', () => {
  render(<BlogListingClient posts={posts} locale="tr" />);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'filterAll' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'filterGuides' })).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('filterGuides');
  expect(screen.queryByRole('link', { name: /Görsel üretim/ })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'filterGuides' }), { key: 'Home' });
  expect(screen.getByRole('tab', { name: 'filterAll' })).toHaveFocus();
  expect(screen.getByRole('link', { name: /Görsel üretim/ })).toBeInTheDocument();
});

it('clears the query with Escape while keeping the selected post type', () => {
  render(<BlogListingClient posts={posts} locale="tr" />);
  fireEvent.click(screen.getByRole('tab', { name: 'filterGuides' }));
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'missing' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input).toHaveValue('');
  expect(screen.getByRole('tab', { name: 'filterGuides' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getByRole('link', { name: /Yapay zekâ rehberi/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Görsel üretim/ })).not.toBeInTheDocument();
});

it('finds authors with Turkish character variants', () => {
  render(<BlogListingClient posts={posts} locale="tr" />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'cagri' } });
  expect(screen.getByRole('link', { name: /Yapay zekâ rehberi/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Görsel üretim/ })).not.toBeInTheDocument();
});

it('matches every search term regardless of order across title and author', () => {
  render(<BlogListingClient posts={posts} locale="tr" />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'rehber zeka' } });
  expect(screen.getByRole('link', { name: /Yapay zekâ rehberi/ })).toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'cagri yapay' } });
  expect(screen.getByRole('link', { name: /Yapay zekâ rehberi/ })).toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'yapay olmayan' } });
  expect(screen.queryByRole('link', { name: /Yapay zekâ rehberi/ })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'noResultsTitle' })).toBeInTheDocument();
});

it('offers a learning link instead of clearing nonexistent filters when there are no posts', () => {
  render(<BlogListingClient posts={[]} locale="tr" />);
  expect(screen.getByRole('heading', { name: 'emptyTitle' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'ctaLearn' })).toHaveAttribute('href', '/ogren');
  expect(screen.queryByRole('button', { name: 'clearFilters' })).not.toBeInTheDocument();
});

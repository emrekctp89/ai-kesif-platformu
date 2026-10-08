import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CategoryGrid } from '@/components/CategoryGrid';
jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async () => (key) => key,
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, prefetch: _prefetch, ...props }) => <a {...props}>{children}</a>,
}));

it('renders English category names and descriptions without changing route slugs', async () => {
  render(
    await CategoryGrid({
      categories: [{ name: 'Görsel Üretim', slug: 'gorsel-uretim' }],
      showAllLink: false,
    })
  );
  expect(screen.getByRole('heading', { name: 'Image Generation' })).toBeInTheDocument();
  expect(
    screen.getByText('Create images, illustrations and visual concepts from text.')
  ).toBeInTheDocument();
  expect(screen.getByRole('link')).toHaveAttribute('href', '/kategori/gorsel-uretim');
  expect(screen.queryByText('Görsel Üretim')).not.toBeInTheDocument();
});

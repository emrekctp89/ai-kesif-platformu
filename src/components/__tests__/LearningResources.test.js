import { fireEvent, render, screen } from '@testing-library/react';
import LearningResources from '@/components/learn/LearningResources';
import messages from '../../../messages/en.json';
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations:
    () =>
    (key, values = {}) =>
      Object.entries(values).reduce(
        (str, [name, value]) => str.replace(`{${name}}`, value),
        messages.LearnStudio[key] || key
      ),
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, prefetch, ...props }) => <a {...props}>{children}</a>,
}));
test('search and type filters preserve real destinations', () => {
  render(
    <LearningResources
      guides={[{ title: 'Image guide', slug: 'images' }]}
      paths={[{ title: 'Writing tools', slug: 'writing', description: 'Draft and edit' }]}
    />
  );
  expect(screen.getByRole('link', { name: 'Read guide' })).toHaveAttribute('href', '/blog/images');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'path' } });
  expect(screen.queryByText('Image guide')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explore path' })).toHaveAttribute(
    'href',
    '/koleksiyonlar/writing'
  );
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'unknown' } });
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText('Image guide')).toBeInTheDocument();
});

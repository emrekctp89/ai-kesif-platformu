import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditToolDialog } from '@/components/EditToolDialog';

let mockLocale = 'tr';
const mockMessages = {
  tr: {
    ToolEditor: {
      edit: 'Düzenle',
      title: '{name} Aracını Düzenle',
      link: 'Link',
      adminDecision: 'Admin kararı',
      openAndCheckLink: 'Linki aç ve kontrol et',
      pricingModel: 'Fiyatlandırma',
      notSelected: 'Seçilmedi',
      name: 'İsim',
      tier: 'Seviye',
      tierNormal: 'Normal',
      tierPro: 'Pro',
      tierSponsored: 'Sponsorlu',
      platforms: 'Platformlar',
      tags: 'Etiketler',
      selectTags: 'Etiket seç…',
      cancel: 'İptal',
      saving: 'Kaydediliyor…',
      saveChanges: 'Değişiklikleri Kaydet',
    },
    Pricing: { free: 'Ücretsiz', freemium: 'Freemium', subscription: 'Abonelik', oneTime: 'Tek seferlik' },
  },
  en: {
    ToolEditor: {
      edit: 'Edit',
      title: 'Edit {name}',
      link: 'Link',
      adminDecision: 'Admin decision',
      openAndCheckLink: 'Open and check link',
      pricingModel: 'Pricing model',
      notSelected: 'Not selected',
      name: 'Name',
      tier: 'Tier',
      tierNormal: 'Normal',
      tierPro: 'Pro',
      tierSponsored: 'Sponsored',
      platforms: 'Platforms',
      tags: 'Tags',
      selectTags: 'Select tags…',
      cancel: 'Cancel',
      saving: 'Saving…',
      saveChanges: 'Save changes',
    },
    Pricing: { free: 'Free', freemium: 'Freemium', subscription: 'Subscription', oneTime: 'One-time payment' },
  },
};

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/app/actions', () => ({ updateTool: jest.fn(), assignTagsToTool: jest.fn() }));
jest.mock('@/components/ToolVariantManager', () => ({ ToolVariantManager: () => null }));
jest.mock('@/components/TranslateButton', () => ({ TranslateButton: () => null }));
jest.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: (namespace) => (key, values) => {
    const value = mockMessages[mockLocale][namespace][key] || key;
    return values
      ? Object.entries(values).reduce((result, [name, replacement]) => result.replace(`{${name}}`, replacement), value)
      : value;
  },
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = jest.fn();
});

it('lets the admin approve a flagged link and resets the decision when the URL changes', () => {
  render(
    <EditToolDialog
      tool={{
        id: 1,
        name: 'Example',
        link: 'https://example.com/',
        link_check_status: 'invalid',
        link_check_error: 'HTTP 405',
        tool_tags: [],
      }}
      categories={[]}
      allTags={[]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Düzenle' }));
  expect(screen.getByText('HTTP 405')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Linki aç/ })).toHaveAttribute(
    'href',
    'https://example.com/'
  );
  const decision = screen.getByLabelText('Admin kararı');
  fireEvent.change(decision, { target: { value: 'manual_valid' } });
  expect(decision).toHaveValue('manual_valid');
  fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://example.com/new' } });
  expect(decision).toHaveValue('keep');
  fireEvent.change(decision, { target: { value: 'automatic' } });
  expect(decision).toHaveValue('automatic');
});

it('shows English pricing labels while keeping the stored pricing value unchanged', () => {
  mockLocale = 'en';
  render(
    <EditToolDialog
      tool={{
        id: 2,
        name: 'Example',
        link: 'https://example.com/',
        pricing_model: 'Ücretsiz',
        tier: 'Normal',
        platforms: [],
        tool_tags: [],
      }}
      categories={[]}
      allTags={[]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  const pricing = screen.getByLabelText('Pricing model');
  expect(screen.getByRole('option', { name: 'Free' })).toBeInTheDocument();
  expect(pricing).toHaveValue('Ücretsiz');
});

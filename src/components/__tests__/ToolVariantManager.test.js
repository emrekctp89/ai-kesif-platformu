import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ToolVariantManager } from '@/components/ToolVariantManager';

jest.mock('@/app/actions', () => ({
  generateToolVariants: jest.fn(),
  updateToolVariants: jest.fn(),
  applyWinningVariant: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key) =>
    ({
      abTestVariants: 'A/B test variants',
      variant: 'Variant',
      impressions: 'Impressions',
      clicks: 'Clicks',
      active: 'Active',
      action: 'Action',
      original: 'Original',
      makeWinner: 'Make winner',
      generating: 'Generating…',
      generateWithAi: 'Generate variants with AI',
      saving: 'Saving…',
      saveActiveStatus: 'Save active/inactive status',
    })[key] || key,
}));

it('renders the variant manager controls in English', () => {
  render(
    <ToolVariantManager
      locale="en"
      tool={{
        id: 1,
        name: 'Example',
        description: 'Example description',
        tool_variants: [],
      }}
    />
  );

  expect(screen.getByRole('heading', { name: 'A/B test variants' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Impressions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate variants with AI' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save active/inactive status' })).toBeInTheDocument();
});

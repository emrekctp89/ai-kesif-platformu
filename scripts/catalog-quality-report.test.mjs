import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCatalog } from './catalog-quality-report.mjs';

test('approved tools alone determine duplicate and coverage metrics', () => {
  const complete = {
    id: 1,
    slug: 'alpha',
    name: 'Alpha',
    is_approved: true,
    link: 'https://alpha.com',
    description: 'A useful product description with enough detail.',
    description_en: 'A useful product description.',
    pricing_model: 'free',
    platforms: ['web'],
    category_id: 2,
    embedding: '[1,2]',
  };
  const incomplete = {
    ...complete,
    id: 2,
    slug: 'alpha-2',
    name: ' alpha ',
    link: 'https://www.alpha.com/path',
    description: '',
    description_en: '',
    pricing_model: null,
    platforms: [],
    category_id: null,
    embedding: null,
    link_check_status: 'invalid',
  };
  const report = analyzeCatalog([complete, incomplete, { ...complete, id: 3, is_approved: false }]);
  assert.equal(report.totalTools, 3);
  assert.equal(report.approvedTools, 2);
  assert.equal(report.embeddingCoverage, 0.5);
  assert.equal(report.counts.duplicate_name, 2);
  assert.equal(report.counts.shared_domain_review, 2);
  assert.equal(report.counts.broken_link_confirmed, 1);
  assert.equal(report.counts.missing_platforms, 1);
  assert.equal(report.counts.missing_pricing, 1);
});

test('link format is separated from confirmed link-check failures', () => {
  const report = analyzeCatalog([
    { id: 4, slug: 'invalid', name: 'Invalid', is_approved: true, link: 'javascript:alert(1)' },
    { id: 5, slug: 'empty', name: 'Empty', is_approved: true, link: '' },
  ]);
  assert.equal(report.counts.invalid_link_format, 1);
  assert.equal(report.counts.missing_link, 1);
  assert.equal(report.counts.broken_link_confirmed || 0, 0);
});

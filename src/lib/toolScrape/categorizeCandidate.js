import { classifyToolText } from '@/lib/categoryTaxonomy';

function buildEvidenceText(candidate) {
  return [
    candidate?.description,
    ...(candidate?.features || []),
    ...(candidate?.use_cases || []),
    ...(candidate?.target_users || []),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Matches a scraped candidate to the production category rows without an LLM call.
 * A weak taxonomy hit is reported but not auto-selected.
 */
export function suggestScrapeCategory(candidate, categories = []) {
  const classification = classifyToolText(
    candidate?.name || '',
    buildEvidenceText(candidate),
    candidate?.link || ''
  );
  const category = categories.find((item) => item.slug === classification.slug) || null;
  const confidence =
    classification.score >= 6 ? 'high' : classification.score >= 3 ? 'medium' : 'low';

  return {
    category: confidence === 'low' ? null : category,
    suggestedCategory: category,
    slug: classification.slug,
    score: classification.score,
    confidence,
    matched: classification.matched.slice(0, 8),
    requiresReview: confidence === 'low' || !category,
  };
}

import {
  formatRating,
  getActiveToolVariants,
  getEditableToolVariants,
  getOriginalToolVariant,
  getToolVariants,
} from '@/utils/toolVariants';

describe('toolVariants utilities', () => {
  it('returns an empty variant list when relation data is missing', () => {
    expect(getToolVariants({ id: 'tool-1' })).toEqual([]);
    expect(getActiveToolVariants({ id: 'tool-1' })).toEqual([]);
    expect(getEditableToolVariants({ id: 'tool-1' })).toEqual([]);
  });

  it('filters active and editable variants safely', () => {
    const tool = {
      tool_variants: [
        { id: 'original', is_original: true, is_active: true },
        { id: 'active', is_original: false, is_active: true },
        { id: 'inactive', is_original: false, is_active: false },
      ],
    };

    expect(getActiveToolVariants(tool)).toEqual([
      { id: 'active', is_original: false, is_active: true },
    ]);
    expect(getEditableToolVariants(tool)).toEqual([
      { id: 'active', is_original: false, is_active: true },
      { id: 'inactive', is_original: false, is_active: false },
    ]);
  });

  it('builds a stable original variant fallback from tool content', () => {
    expect(
      getOriginalToolVariant({
        id: 'abc',
        name: 'Example AI',
        description: 'Example description',
      })
    ).toEqual({
      id: 'original-abc',
      title: 'Example AI',
      description: 'Example description',
      impressions: 0,
      clicks: 0,
    });
  });

  it('formats ratings without throwing on malformed values', () => {
    expect(formatRating(4.25)).toBe('4.3');
    expect(formatRating('3')).toBe('3.0');
    expect(formatRating(null)).toBe('0.0');
    expect(formatRating('not-a-number')).toBe('0.0');
  });
});

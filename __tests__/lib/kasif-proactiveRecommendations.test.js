import {
  buildProactiveThemes,
  filterProactiveDelivery,
  rankProactiveSuggestions,
} from '@/lib/kasif/proactiveRecommendations';

const interaction = {
  id: 'interaction-1',
  question: 'SEO uyumlu blog yazısı hazırlamak istiyorum',
  source_ids: ['old-tool-id'],
  intent: { goals: ['content-writing', 'seo-optimization'], packId: 'content-studio' },
  funnel: {
    stages: { job_done: '2026-06-01T10:00:00.000Z' },
    selected_tool: { slug: 'old-writer' },
  },
  created_at: '2026-06-01T09:00:00.000Z',
};

describe('Kâşif proactive recommendations', () => {
  it('yalnız tamamlanan işler ve seçilmiş paketlerden tema üretir', () => {
    const themes = buildProactiveThemes([
      interaction,
      {
        id: 'ignored',
        question: 'rastgele soru',
        intent: { goals: ['translation'] },
        funnel: { stages: {} },
        created_at: '2026-06-02T09:00:00.000Z',
      },
    ]);
    expect(themes).toHaveLength(1);
    expect(themes[0].packId).toBe('content-studio');
  });

  it('geçmiş işten sonra eklenen ilgili ve daha önce kullanılmamış aracı önerir', () => {
    const suggestions = rankProactiveSuggestions(
      [interaction],
      [
        {
          id: 'new-tool-id',
          name: 'SEO Writer',
          slug: 'seo-writer',
          description: 'SEO optimizasyonu ve içerik yazımı için blog aracı',
          created_at: '2026-07-01T09:00:00.000Z',
        },
        {
          id: 'old-tool-id',
          name: 'Old SEO Tool',
          slug: 'old-writer',
          description: 'SEO içerik yazımı',
          created_at: '2026-07-02T09:00:00.000Z',
        },
        {
          id: 'unrelated',
          name: 'Music Maker',
          slug: 'music-maker',
          description: 'Müzik ve ses üretimi',
          created_at: '2026-07-03T09:00:00.000Z',
        },
      ],
      { locale: 'tr' }
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].tool.slug).toBe('seo-writer');
    expect(suggestions[0].context.goalLabel).toBe('İçerik yazımı');
  });

  it('işten önce katalogda olan aracı yeni diye göstermez', () => {
    const suggestions = rankProactiveSuggestions(
      [interaction],
      [
        {
          id: 'older',
          name: 'SEO Writer',
          slug: 'seo-writer',
          description: 'SEO içerik yazımı',
          created_at: '2026-05-01T09:00:00.000Z',
        },
      ],
      { locale: 'tr' }
    );
    expect(suggestions).toEqual([]);
  });

  it('haftalık gösterim sınırı ve araç cooldown uygular', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');
    const suggestions = ['one', 'two', 'three'].map((slug, index) => ({
      suggestionKey: `interaction-${index}:${slug}`,
      tool: { slug },
    }));
    const events = [
      {
        suggestion_key: 'old:one',
        event_type: 'shown',
        tool_slug: 'one',
        created_at: '2026-07-30T12:00:00.000Z',
      },
      {
        suggestion_key: 'old:other',
        event_type: 'shown',
        tool_slug: 'other',
        created_at: '2026-07-29T12:00:00.000Z',
      },
    ];

    const result = filterProactiveDelivery(suggestions, events, { now });
    expect(result.suggestions.map((item) => item.tool.slug)).toEqual(['two']);
    expect(result.delivery).toMatchObject({ remaining: 1, limited: false });
  });

  it('gizlenen öneriyi kalıcı eler ve haftalık kota dolunca sonuç döndürmez', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');
    const suggestion = { suggestionKey: 'interaction-1:new-tool', tool: { slug: 'new-tool' } };
    const events = [
      {
        suggestion_key: suggestion.suggestionKey,
        event_type: 'dismissed',
        tool_slug: 'new-tool',
        created_at: '2026-01-01T12:00:00.000Z',
      },
      ...[1, 2, 3].map((index) => ({
        suggestion_key: `other:${index}`,
        event_type: 'shown',
        tool_slug: `other-${index}`,
        created_at: '2026-07-30T12:00:00.000Z',
      })),
    ];

    const result = filterProactiveDelivery([suggestion], events, { now });
    expect(result.suggestions).toEqual([]);
    expect(result.delivery).toMatchObject({ remaining: 0, limited: true });
  });
});

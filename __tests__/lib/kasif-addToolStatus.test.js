const {
  detectAddToolStatusIntent,
  extractAddToolRefsFromHistory,
  classifyToolQueueStatus,
  formatAddToolStatusAnswer,
} = require('../../src/lib/kasif/addToolStatus');

describe('addToolStatus', () => {
  it('detects TR/EN status phrases', () => {
    expect(detectAddToolStatusIntent('durumumu sor').isStatus).toBe(true);
    expect(detectAddToolStatusIntent('check my tool status').isStatus).toBe(true);
    expect(detectAddToolStatusIntent('Ücretsiz sunum öner').isStatus).toBe(false);
  });

  it('extracts URL and slug from question', () => {
    const d = detectAddToolStatusIntent('Durumumu sor https://acme.ai ve slug `acme`');
    expect(d.isStatus).toBe(true);
    expect(d.url).toContain('acme.ai');
    expect(d.slug).toBe('acme');
  });

  it('pulls refs from history assistant queue message', () => {
    const refs = extractAddToolRefsFromHistory([
      { role: 'user', content: 'Bu aracı ekle https://widget.io' },
      {
        role: 'assistant',
        content:
          '**Widget** admin inceleme kuyruğuna alındı.\nBağlantı: https://widget.io\nTaslak slug: `widget`',
      },
    ]);
    expect(refs.url).toContain('widget.io');
    expect(refs.slug).toBe('widget');
  });

  it('classifies approved vs pending', () => {
    expect(classifyToolQueueStatus(null)).toBe('not_found');
    expect(classifyToolQueueStatus({ is_approved: true })).toBe('approved');
    expect(classifyToolQueueStatus({ is_approved: false })).toBe('pending');
  });

  it('formats need_ref / pending / approved answers', () => {
    expect(formatAddToolStatusAnswer({ status: 'need_ref' }, 'tr')).toMatch(/URL|slug/i);
    expect(
      formatAddToolStatusAnswer(
        {
          status: 'pending',
          tool: { name: 'Acme', link: 'https://acme.ai', slug: 'acme', is_approved: false },
        },
        'en'
      )
    ).toMatch(/pending|review/i);
    expect(
      formatAddToolStatusAnswer(
        {
          status: 'approved',
          tool: { name: 'Acme', link: 'https://acme.ai', slug: 'acme', is_approved: true },
        },
        'tr'
      )
    ).toMatch(/onaylandı|yayında/i);
  });
});

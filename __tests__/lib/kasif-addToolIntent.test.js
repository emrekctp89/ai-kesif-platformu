const {
  detectAddToolIntent,
  answerAddToolPrompt,
  formatAddToolResultAnswer,
} = require('../../src/lib/kasif/addToolIntent');

describe('addToolIntent', () => {
  it('URL + ekle ifadesini yakalar', () => {
    const d = detectAddToolIntent('Bu aracı ekle https://example-product.com/');
    expect(d.isAddTool).toBe(true);
    expect(d.url).toBe('https://example-product.com/');
    expect(d.reason).toBe('ready');
  });

  it('URL yoksa missing_url döner', () => {
    const d = detectAddToolIntent('Kataloga yeni bir araç ekle');
    expect(d.isAddTool).toBe(true);
    expect(d.url).toBeNull();
    expect(d.reason).toBe('missing_url');
    expect(answerAddToolPrompt('tr', d)).toMatch(/URL/i);
  });

  it('İngilizce add this tool yakalar', () => {
    const d = detectAddToolIntent('Please add this tool https://acme.ai');
    expect(d.isAddTool).toBe(true);
    expect(d.url).toContain('acme.ai');
  });

  it('normal soruyu add-tool saymaz', () => {
    expect(detectAddToolIntent('Ücretsiz sunum aracı öner').isAddTool).toBe(false);
  });

  it('formatAddToolResultAnswer kuyruk ve hata metni üretir', () => {
    expect(
      formatAddToolResultAnswer(
        {
          ok: true,
          status: 'queued',
          candidate: { name: 'Acme', link: 'https://acme.ai' },
          inserted: { slug: 'acme', link: 'https://acme.ai' },
        },
        'tr'
      )
    ).toMatch(/Acme|admin/i);

    expect(formatAddToolResultAnswer({ ok: false, error: 'blocked' }, 'en')).toMatch(/couldn/i);
  });
});

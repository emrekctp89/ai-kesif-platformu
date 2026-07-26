/**
 * Offline eval: pack runners + add-tool intent (CI-safe, no live server).
 */

const { RUNNABLE_PACK_IDS, isRunnablePack } = require('../../src/lib/kasif/jobPacks');
const {
  runPack,
  formatPackArtifact,
  extractRunSteps,
  buildLocalContentStudioRun,
  buildLocalSeoBriefRun,
  buildLocalCodeScaffoldRun,
} = require('../../src/lib/kasif/packRunner');
const {
  detectAddToolIntent,
  answerAddToolPrompt,
  formatAddToolResultAnswer,
} = require('../../src/lib/kasif/addToolIntent');
const { answerContextlessFollowUp, isContextlessFollowUp } = require('../../src/lib/kasif/engine');
const {
  pickSoftLandingVariant,
  resolveSoftLandingVariant,
  getSoftLandingVariantConfig,
  listSoftLandingStarters,
  buildSoftLandingAnswer,
  SOFT_LANDING_STARTERS,
} = require('../../src/lib/kasif/softLanding');

describe('offline pack runner eval', () => {
  it('10 runnable pack tanımlıdır', () => {
    expect(RUNNABLE_PACK_IDS).toHaveLength(10);
    for (const id of RUNNABLE_PACK_IDS) {
      expect(isRunnablePack(id)).toBe(true);
    }
  });

  it.each(RUNNABLE_PACK_IDS.map((id) => [id]))(
    'pack %s local/LLM-fallback artifact üretir',
    async (packId) => {
      const run = await runPack(packId, `Offline eval brief for ${packId} pack`, 'tr');
      expect(run.packId).toBe(packId);
      expect(run.source).toMatch(/local|gemini|partner|provider/);
      const text = formatPackArtifact(run, 'tr');
      expect(text.length).toBeGreaterThan(40);
      // multi-step packs expose steps for UI
      if (
        ['seo-brief', 'support-kit', 'code-scaffold', 'legal-review', 'research-brief'].includes(
          packId
        )
      ) {
        expect(extractRunSteps(run).length).toBeGreaterThanOrEqual(3);
      }
    },
    20000
  );

  it('yerel builders deterministik çıktı verir', () => {
    const a = buildLocalContentStudioRun('topic x', 'en');
    const b = buildLocalContentStudioRun('topic x', 'en');
    expect(a.draft).toBe(b.draft);
    expect(buildLocalSeoBriefRun('ai tools', 'tr').steps.length).toBeGreaterThanOrEqual(4);
    expect(buildLocalCodeScaffoldRun('api', 'en').scaffold).toMatch(/function|const|export/i);
  });
});

describe('offline add-tool eval', () => {
  it('URL ile ready; URL yoksa missing_url', () => {
    expect(detectAddToolIntent('Bu aracı ekle https://product.example.com').reason).toBe('ready');
    expect(detectAddToolIntent('Kataloga araç ekle').reason).toBe('missing_url');
    expect(detectAddToolIntent('Sunum aracı öner').isAddTool).toBe(false);
  });

  it('missing_url cevabı URL ister', () => {
    const body = answerAddToolPrompt('tr', { reason: 'missing_url' });
    expect(body).toMatch(/URL|url|https/i);
  });

  it('queued / duplicate formatları net', () => {
    const queuedEn = formatAddToolResultAnswer(
      {
        ok: true,
        status: 'queued',
        candidate: { name: 'Acme', link: 'https://acme.ai' },
        inserted: { slug: 'acme' },
      },
      'en'
    );
    expect(queuedEn).toMatch(/Queued|admin/i);
    expect(queuedEn).toMatch(/1–3 business days|SLA/i);
    expect(
      formatAddToolResultAnswer(
        { ok: true, status: 'duplicate', candidate: { name: 'Acme', link: 'https://acme.ai' } },
        'tr'
      )
    ).toMatch(/katalog|zaten/i);
    const queuedTr = formatAddToolResultAnswer(
      {
        ok: true,
        status: 'queued',
        candidate: { name: 'Acme', link: 'https://acme.ai' },
        inserted: { slug: 'acme' },
      },
      'tr'
    );
    expect(queuedTr).toMatch(/1–3 iş günü|SLA/i);
  });
});

describe('soft-landing A/B eval', () => {
  it('varyant seçimi deterministik seed ile', () => {
    expect(pickSoftLandingVariant('seed-aaa', { defaultVariant: 'ab' })).toBe(
      pickSoftLandingVariant('seed-aaa', { defaultVariant: 'ab' })
    );
    expect(['A', 'B']).toContain(pickSoftLandingVariant('seed-1', { defaultVariant: 'ab' }));
  });

  it('env pin / force default winner', () => {
    expect(getSoftLandingVariantConfig({ defaultVariant: 'B' }).mode).toBe('pin_B');
    expect(pickSoftLandingVariant('anything', { defaultVariant: 'B' })).toBe('B');
    expect(pickSoftLandingVariant('anything', { force: 'A', defaultVariant: 'B' })).toBe('A');
    expect(resolveSoftLandingVariant('B', 'seed', { force: 'A' })).toBe('A');
    expect(resolveSoftLandingVariant('B', 'seed', { defaultVariant: 'A' })).toBe('B');
    expect(resolveSoftLandingVariant(null, 'seed', { defaultVariant: 'B' })).toBe('B');
  });

  it('starter kataloğu ve liste dolu', () => {
    expect(SOFT_LANDING_STARTERS.length).toBeGreaterThanOrEqual(6);
    const list = listSoftLandingStarters('tr', { limit: 4, preferIds: ['seo', 'meeting'] });
    expect(list).toHaveLength(4);
    expect(list[0].id).toBe('seo');
  });

  it('A ve B kopyaları farklı; soft-landing yanıtı starters taşır', () => {
    const a = buildSoftLandingAnswer({ wantsFree: true }, 'tr', 'A');
    const b = buildSoftLandingAnswer({ wantsFree: true }, 'tr', 'B');
    expect(a).not.toBe(b);
    expect(b).toMatch(/15 saniye|dokun/i);

    expect(isContextlessFollowUp('Peki bunlardan hangileri?', [])).toBe(true);
    const response = answerContextlessFollowUp(
      'Peki bunlardan ücretsiz olanlar hangileri?',
      'tr',
      [],
      {
        variant: 'B',
      }
    );
    expect(response.softLanding).toBe(true);
    expect(response.softLandingVariant).toBe('B');
    expect(response.starters?.length).toBeGreaterThanOrEqual(4);
    expect(response.intent.softLandingVariant).toBe('B');
  });
});

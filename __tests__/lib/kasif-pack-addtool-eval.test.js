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
    expect(
      formatAddToolResultAnswer(
        {
          ok: true,
          status: 'queued',
          candidate: { name: 'Acme', link: 'https://acme.ai' },
          inserted: { slug: 'acme' },
        },
        'en'
      )
    ).toMatch(/Queued|admin/i);
    expect(
      formatAddToolResultAnswer(
        { ok: true, status: 'duplicate', candidate: { name: 'Acme', link: 'https://acme.ai' } },
        'tr'
      )
    ).toMatch(/katalog|zaten/i);
  });
});

describe('soft-landing A/B eval', () => {
  it('varyant seçimi deterministik seed ile', () => {
    expect(pickSoftLandingVariant('seed-aaa')).toBe(pickSoftLandingVariant('seed-aaa'));
    expect(['A', 'B']).toContain(pickSoftLandingVariant('seed-1'));
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

/**
 * CLI dry-run worker: yalnızca KASIF_REPROCESS_INPUT set ise çalışır.
 * npm run kasif:reprocess-intents bu dosyayı tetikler.
 */
jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import fs from 'node:fs';
import { answerMetaQuestion, answerQuestion, understandConversation } from '@/lib/kasif/engine';

const inputPath = process.env.KASIF_REPROCESS_INPUT;
const shouldRun = Boolean(inputPath && fs.existsSync(inputPath));

(shouldRun ? describe : describe.skip)('kasif reprocess worker', () => {
  it('reports intent/meta deltas for stored questions', () => {
    const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const changed = [];
    let metaCount = 0;
    let goalGained = 0;

    for (const row of rows) {
      const question = String(row.question || '').trim();
      if (!question) continue;

      const meta = answerMetaQuestion(question, 'tr');
      if (meta) {
        metaCount += 1;
        changed.push({
          id: row.id,
          question,
          kind: 'meta',
          oldGoals: Array.isArray(row.intent?.goals) ? row.intent.goals : [],
          newGoals: [],
          oldConfidence: row.confidence,
          newConfidence: meta.confidence,
          metaKind: meta.metaKind,
        });
        continue;
      }

      const intent = understandConversation(question, []);
      const oldGoals = Array.isArray(row.intent?.goals) ? row.intent.goals.join(',') : '';
      const newGoals = (intent.goals || []).join(',');
      const synthetic = answerQuestion(
        question,
        [
          {
            id: 1,
            name: 'Probe',
            description: `${question} sunum slayt gorsel kod veri`,
            pricing_model: 'freemium',
          },
        ],
        [],
        'tr'
      );

      if (oldGoals !== newGoals || Number(row.confidence || 0) < 0.55) {
        if (!oldGoals && newGoals) goalGained += 1;
        changed.push({
          id: row.id,
          question,
          kind: 'intent',
          oldGoals: oldGoals ? oldGoals.split(',') : [],
          newGoals: intent.goals || [],
          oldConfidence: row.confidence,
          newConfidence: synthetic.confidence,
          pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          scanned: rows.length,
          changed: changed.length,
          metaCount,
          goalGained,
          samples: changed.slice(0, 25),
        },
        null,
        2
      )
    );

    expect(Array.isArray(rows)).toBe(true);
  });
});

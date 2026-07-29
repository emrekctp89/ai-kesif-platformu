/** @jest-environment node */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/kasif/engine', () => ({
  prioritizeGoals: (goals) => goals,
  understandQuestion: jest.fn(),
}));
jest.mock('@/lib/kasif/partnerRunner', () => ({ callLlmJson: jest.fn() }));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }));

import { understandQuestion } from '@/lib/kasif/engine';
import { callLlmJson } from '@/lib/kasif/partnerRunner';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  applyLearnedAliases,
  intentUnderstandingConfidence,
  understandQuestionWithLlm,
} from '@/lib/kasif/understanding';

const emptyIntent = {
  tokens: ['bilinmeyen', 'ifade'],
  goals: [],
  concepts: [],
  signals: [],
  wantsFree: false,
  wantsPaid: false,
  wantsComparison: false,
};

function mockAliasQuery(rows = []) {
  const query = {};
  for (const method of ['select', 'eq', 'gte', 'order']) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.limit = jest.fn().mockResolvedValue({ data: rows, error: null });
  createAdminClient.mockReturnValue({ from: jest.fn().mockReturnValue(query) });
}

describe('Kâşif LLM understanding fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KASIF_LLM_UNDERSTANDING_THRESHOLD;
  });

  it('yüksek güvenli regex sonucunda LLM ve veritabanını çağırmaz', async () => {
    understandQuestion.mockReturnValue({
      ...emptyIntent,
      goals: ['image-generation'],
      concepts: ['gorsel-uretim'],
    });

    await expect(understandQuestionWithLlm('görsel üret')).resolves.toMatchObject({
      source: 'regex',
      confidence: 0.9,
    });
    expect(callLlmJson).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('öğrenilmiş alias LLM maliyeti oluşturmadan canonical goal ekler', async () => {
    understandQuestion.mockReturnValue(emptyIntent);
    mockAliasQuery([
      {
        alias: 'gurultu temizle',
        target_type: 'goal',
        target_key: 'voice-generation',
        confidence: 0.9,
      },
    ]);

    await expect(understandQuestionWithLlm('Podcast gurultu temizle')).resolves.toMatchObject({
      source: 'learned',
      intent: { goals: ['voice-generation'] },
    });
    expect(callLlmJson).not.toHaveBeenCalled();
  });

  it('düşük güvende partner zincirine düşer ve sadece canonical anahtarları kabul eder', async () => {
    understandQuestion.mockReturnValue(emptyIntent);
    mockAliasQuery([]);
    callLlmJson.mockResolvedValue({
      source: 'partner',
      data: {
        confidence: 0.88,
        goals: ['meeting-notes', 'invented-goal'],
        concepts: ['uretkenlik', 'invented-concept'],
        aliases: [],
      },
    });

    await expect(understandQuestionWithLlm('görüşmeyi aksiyona çevir')).resolves.toMatchObject({
      source: 'partner',
      intent: {
        goals: ['meeting-notes'],
        concepts: ['uretkenlik'],
      },
    });
  });

  it('alias eşleşmesini saf biçimde uygular', () => {
    expect(
      applyLearnedAliases('Ses parazitini sil', emptyIntent, [
        {
          alias: 'parazitini sil',
          target_type: 'concept',
          target_key: 'ses-uretim',
        },
      ])
    ).toMatchObject({ concepts: ['ses-uretim'] });
    expect(intentUnderstandingConfidence(emptyIntent)).toBe(0.35);
  });
});

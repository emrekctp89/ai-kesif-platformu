/** @jest-environment node */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/kasif/partnerRunner', () => ({ callLlmText: jest.fn() }));

import { callLlmText } from '@/lib/kasif/partnerRunner';
import { enhanceKasifConversation, isConversationalLlmEnabled } from '@/lib/kasif/conversation';

const base = {
  answer: 'Deterministik öneri.',
  sourceIds: ['tool:7'],
  confidence: 0.8,
};
const records = [
  {
    id: 7,
    name: 'Catalog Tool',
    description: 'Approved catalog description.',
    pricing_model: 'Ücretsiz',
    slug: 'catalog-tool',
  },
  { id: 8, name: 'Unselected Tool', description: 'Must not enter prompt.' },
];

describe('Kâşif grounded conversational layer', () => {
  const previous = process.env.KASIF_CONVERSATIONAL_LLM_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.KASIF_CONVERSATIONAL_LLM_ENABLED;
    else process.env.KASIF_CONVERSATIONAL_LLM_ENABLED = previous;
    jest.clearAllMocks();
  });

  it('opt-in kapalıyken provider çağırmaz ve deterministik yanıtı korur', async () => {
    delete process.env.KASIF_CONVERSATIONAL_LLM_ENABLED;
    expect(isConversationalLlmEnabled()).toBe(false);
    await expect(
      enhanceKasifConversation({ question: 'Öner', modelResponse: base, records })
    ).resolves.toBe(base);
    expect(callLlmText).not.toHaveBeenCalled();
  });

  it('opt-in açıkken yalnız seçilmiş katalog kaynaklarıyla sohbet yanıtı üretir', async () => {
    process.env.KASIF_CONVERSATIONAL_LLM_ENABLED = 'true';
    callLlmText.mockResolvedValue({
      text: 'Catalog Tool, doğrulanmış katalog verisine göre bu iş için uygun bir başlangıçtır.',
      source: 'deepseek',
    });
    const result = await enhanceKasifConversation({
      question: 'Hangisini önerirsin?',
      history: [{ role: 'user', content: 'Ücretsiz olsun.' }],
      modelResponse: base,
      records,
      locale: 'tr',
    });
    expect(result).toMatchObject({ conversational: true, conversationalSource: 'deepseek' });
    const prompt = callLlmText.mock.calls[0][0];
    expect(prompt).toContain('Catalog Tool');
    expect(prompt).not.toContain('Unselected Tool');
    expect(callLlmText.mock.calls[0][1].history).toHaveLength(1);
  });

  it('provider boş dönerse yerel yanıtı korur', async () => {
    process.env.KASIF_CONVERSATIONAL_LLM_ENABLED = 'true';
    callLlmText.mockResolvedValue({ text: null, source: null });
    await expect(
      enhanceKasifConversation({ question: 'Öner', modelResponse: base, records })
    ).resolves.toBe(base);
  });
});

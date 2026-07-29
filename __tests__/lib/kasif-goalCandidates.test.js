/** @jest-environment node */
jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/utils/gemini', () => ({ embedGeminiText: jest.fn() }));

import {
  buildGoalCandidate,
  clusterQuestionEmbeddings,
  cosineSimilarity,
  parseEmbedding,
} from '@/lib/kasif/goalCandidates';

describe('Kâşif goal candidate clustering', () => {
  it('vector değerini ayrıştırır ve cosine hesaplar', () => {
    expect(parseEmbedding('[1,0,0]')).toEqual([1, 0, 0]);
    expect(cosineSimilarity([1, 0, 0], [0.99, 0.01, 0])).toBeGreaterThan(0.99);
  });
  it('benzer soruları aynı, farklı ihtiyacı ayrı kümeye alır', () => {
    const clusters = clusterQuestionEmbeddings(
      [
        { id: '1', question: 'Podcast ses temizleme', embedding: '[1,0,0]' },
        { id: '2', question: 'Podcast gürültü temizleme', embedding: '[0.99,0.01,0]' },
        { id: '3', question: 'Ürün fotoğrafı', embedding: '[0,1,0]' },
      ],
      { threshold: 0.8 }
    );
    expect(clusters.map((cluster) => cluster.members.length)).toEqual([2, 1]);
  });
  it('admin için açıklanabilir aday üretir', () => {
    const cluster = clusterQuestionEmbeddings([
      { id: '1', question: 'Podcast ses temizleme', embedding: '[1,0,0]' },
      { id: '2', question: 'Podcast ses gürültü temizleme', embedding: '[1,0,0]' },
    ])[0];
    expect(buildGoalCandidate(cluster)).toMatchObject({
      occurrence_count: 2,
      average_similarity: 1,
      keywords: expect.arrayContaining(['podcast', 'ses', 'temizleme']),
      signature: expect.stringMatching(/^[a-f0-9]{24}$/),
    });
  });
});

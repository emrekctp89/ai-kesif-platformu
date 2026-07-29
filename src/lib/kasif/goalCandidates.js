import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { embedGeminiText } from '@/utils/gemini';

const STOP_WORDS = new Set([
  'acaba',
  'arac',
  'araci',
  'araclar',
  'bana',
  'bunlardan',
  'hangileri',
  'hangi',
  'icin',
  'istiyorum',
  'olan',
  'olarak',
  'oner',
  'onerir',
  'onerirsin',
  'peki',
  'sey',
  'this',
  'that',
  'those',
  'tool',
  'tools',
  'want',
  'what',
  'which',
  'with',
]);

export function parseEmbedding(value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (typeof value !== 'string') return [];
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(Number)
    .filter(Number.isFinite);
}

export function cosineSimilarity(left, right) {
  if (!left?.length || left.length !== right?.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  return leftMagnitude && rightMagnitude
    ? dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
    : 0;
}

function centroidOf(vectors) {
  if (!vectors.length) return [];
  const centroid = Array(vectors[0].length).fill(0);
  for (const vector of vectors) {
    for (let index = 0; index < centroid.length; index += 1) centroid[index] += vector[index];
  }
  return centroid.map((value) => value / vectors.length);
}

export function clusterQuestionEmbeddings(rows, { threshold = 0.78 } = {}) {
  const clusters = [];
  for (const row of rows || []) {
    const embedding = parseEmbedding(row.embedding);
    if (!embedding.length) continue;
    let bestCluster = null;
    let bestSimilarity = -1;
    for (const cluster of clusters) {
      const similarity = cosineSimilarity(embedding, cluster.centroid);
      if (similarity > bestSimilarity) {
        bestCluster = cluster;
        bestSimilarity = similarity;
      }
    }
    if (!bestCluster || bestSimilarity < threshold) {
      clusters.push({ members: [{ ...row, embedding }], centroid: embedding });
    } else {
      bestCluster.members.push({ ...row, embedding });
      bestCluster.centroid = centroidOf(bestCluster.members.map((member) => member.embedding));
    }
  }
  return clusters;
}

function questionKeywords(questions, limit = 6) {
  const counts = new Map();
  for (const question of questions) {
    const tokens = String(question || '')
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
    for (const token of new Set(tokens)) counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'tr'))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

export function buildGoalCandidate(cluster) {
  const questions = cluster.members.map((member) => member.question);
  const keywords = questionKeywords(questions);
  const source = [...keywords].sort().slice(0, 5).join('|') || questions[0];
  const similarities = cluster.members.map((member) =>
    cosineSimilarity(member.embedding, cluster.centroid)
  );
  const timestamps = cluster.members
    .map((member) => member.created_at)
    .filter(Boolean)
    .sort();
  return {
    signature: createHash('sha256').update(source).digest('hex').slice(0, 24),
    label: keywords.slice(0, 3).join(' · ') || 'Yeni Kâşif goal adayı',
    keywords,
    sample_questions: [...new Set(questions)].slice(0, 5),
    interaction_ids: cluster.members.map((member) => member.id),
    occurrence_count: cluster.members.length,
    average_similarity: similarities.reduce((sum, value) => sum + value, 0) / similarities.length,
    centroid: `[${cluster.centroid.join(',')}]`,
    first_seen_at: timestamps[0] || null,
    last_seen_at: timestamps.at(-1) || null,
    updated_at: new Date().toISOString(),
  };
}

function bounded(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
}

export async function refreshKasifGoalCandidates(options = {}) {
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - bounded(options.lookbackDays, 90, 7, 365) * 86400000
  ).toISOString();
  const { data, error } = await admin
    .from('kasif_interactions')
    .select('id, question, embedding, created_at')
    .eq('intent->>meta', 'soft-landing')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(bounded(options.interactionLimit, 1000, 10, 5000));
  if (error) throw new Error(`KASIF_GOAL_SOURCE_FETCH_FAILED: ${error.message || error.code}`);
  const rows = data || [];
  let embedded = 0;
  let embeddingFailed = 0;
  const missing = rows
    .filter((row) => !parseEmbedding(row.embedding).length)
    .slice(0, bounded(options.embeddingLimit, 200, 1, 500));
  for (const row of missing) {
    try {
      const embedding = await embedGeminiText(row.question);
      const serialized = `[${embedding.join(',')}]`;
      const { error: updateError } = await admin
        .from('kasif_interactions')
        .update({ embedding: serialized })
        .eq('id', row.id);
      if (updateError) throw updateError;
      row.embedding = serialized;
      embedded += 1;
    } catch {
      embeddingFailed += 1;
    }
  }
  const clusters = clusterQuestionEmbeddings(rows, {
    threshold: bounded(options.similarityThreshold, 0.78, 0.5, 0.99),
  });
  const candidates = clusters
    .filter((cluster) => cluster.members.length >= bounded(options.minimumClusterSize, 3, 2, 100))
    .map(buildGoalCandidate);
  if (candidates.length) {
    const { error: upsertError } = await admin
      .from('kasif_goal_candidates')
      .upsert(candidates, { onConflict: 'signature' });
    if (upsertError)
      throw new Error(
        `KASIF_GOAL_CANDIDATE_UPSERT_FAILED: ${upsertError.message || upsertError.code}`
      );
  }
  return {
    sourceInteractions: rows.length,
    embedded,
    embeddingFailed,
    clusteredInteractions: clusters.reduce((sum, cluster) => sum + cluster.members.length, 0),
    clusterCount: clusters.length,
    candidateCount: candidates.length,
  };
}

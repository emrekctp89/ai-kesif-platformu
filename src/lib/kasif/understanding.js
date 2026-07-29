import 'server-only';

import { createAdminClient } from '@/utils/supabase/admin';
import { callLlmJson } from './partnerRunner';
import { prioritizeGoals, understandQuestion } from './engine';
import { KASIF_CONCEPTS, KASIF_GOALS } from './lexicon';
import { includesNormalized, normalizeText } from './retrieval';

const GOAL_KEYS = new Set(Object.keys(KASIF_GOALS));
const CONCEPT_KEYS = new Set(Object.keys(KASIF_CONCEPTS));

export function intentUnderstandingConfidence(intent) {
  if (intent?.goals?.length) return 0.9;
  if (intent?.concepts?.length) return 0.75;
  if (intent?.tokens?.length >= 2) return 0.35;
  return 0.15;
}

function mergeIntent(base, additions = {}) {
  return {
    ...base,
    goals: prioritizeGoals([
      ...new Set(
        [...(base.goals || []), ...(additions.goals || [])].filter((key) => GOAL_KEYS.has(key))
      ),
    ]),
    concepts: [
      ...new Set(
        [...(base.concepts || []), ...(additions.concepts || [])].filter((key) =>
          CONCEPT_KEYS.has(key)
        )
      ),
    ],
    signals: [...new Set([...(base.signals || []), ...(additions.signals || [])])],
  };
}

async function loadLearnedAliases() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kasif_lexicon_aliases')
      .select('alias, target_type, target_key, confidence')
      .eq('status', 'active')
      .gte('confidence', 0.8)
      .order('observations', { ascending: false })
      .limit(500);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export function applyLearnedAliases(question, intent, aliases = []) {
  const normalized = normalizeText(question);
  const additions = { goals: [], concepts: [], signals: [] };
  for (const row of aliases) {
    if (!includesNormalized(normalized, row.alias)) continue;
    if (row.target_type === 'goal' && GOAL_KEYS.has(row.target_key)) {
      additions.goals.push(row.target_key);
    }
    if (row.target_type === 'concept' && CONCEPT_KEYS.has(row.target_key)) {
      additions.concepts.push(row.target_key);
    }
    additions.signals.push(normalizeText(row.alias));
  }
  return mergeIntent(intent, additions);
}

function validateLlmUnderstanding(question, data) {
  if (!data || typeof data !== 'object') return null;
  const confidence = Math.min(Math.max(Number(data.confidence) || 0, 0), 1);
  const goals = (Array.isArray(data.goals) ? data.goals : []).filter((key) => GOAL_KEYS.has(key));
  const concepts = (Array.isArray(data.concepts) ? data.concepts : []).filter((key) =>
    CONCEPT_KEYS.has(key)
  );
  const normalizedQuestion = normalizeText(question);
  const aliases = (Array.isArray(data.aliases) ? data.aliases : []).flatMap((item) => {
    const alias = normalizeText(item?.phrase).slice(0, 80);
    const targetType = item?.targetType;
    const targetKey = item?.targetKey;
    const validTarget =
      (targetType === 'goal' && GOAL_KEYS.has(targetKey)) ||
      (targetType === 'concept' && CONCEPT_KEYS.has(targetKey));
    return alias.length >= 3 && normalizedQuestion.includes(alias) && validTarget
      ? [{ alias, targetType, targetKey }]
      : [];
  });
  return { confidence, goals, concepts, aliases };
}

async function persistAliases(question, result, source) {
  if (result.confidence < 0.8 || !result.aliases.length) return;
  try {
    const admin = createAdminClient();
    for (const item of result.aliases) {
      const identity = {
        alias: item.alias,
        target_type: item.targetType,
        target_key: item.targetKey,
      };
      const { data: existing } = await admin
        .from('kasif_lexicon_aliases')
        .select('id, observations, confidence')
        .match(identity)
        .maybeSingle();
      if (existing) {
        await admin
          .from('kasif_lexicon_aliases')
          .update({
            observations: Number(existing.observations || 0) + 1,
            confidence: Math.max(Number(existing.confidence || 0), result.confidence),
            last_seen_at: new Date().toISOString(),
            example_question: String(question).slice(0, 800),
          })
          .eq('id', existing.id);
      } else {
        await admin.from('kasif_lexicon_aliases').insert({
          ...identity,
          confidence: result.confidence,
          source,
          example_question: String(question).slice(0, 800),
        });
      }
    }
  } catch {
    // Learning must never make understanding unavailable.
  }
}

export async function understandQuestionWithLlm(question) {
  const regexIntent = understandQuestion(question);
  const minimumConfidence = Math.min(
    Math.max(Number(process.env.KASIF_LLM_UNDERSTANDING_THRESHOLD) || 0.7, 0.4),
    0.95
  );
  if (intentUnderstandingConfidence(regexIntent) >= minimumConfidence) {
    return {
      intent: regexIntent,
      source: 'regex',
      confidence: intentUnderstandingConfidence(regexIntent),
    };
  }

  const learnedIntent = applyLearnedAliases(question, regexIntent, await loadLearnedAliases());
  if (intentUnderstandingConfidence(learnedIntent) >= minimumConfidence) {
    return {
      intent: learnedIntent,
      source: 'learned',
      confidence: intentUnderstandingConfidence(learnedIntent),
    };
  }

  const prompt = `Classify this Kâşif user query into the existing taxonomy.
Return JSON only:
{"confidence":0..1,"goals":[],"concepts":[],"aliases":[{"phrase":"","targetType":"goal|concept","targetKey":""}]}
Allowed goals: ${[...GOAL_KEYS].join(', ')}
Allowed concepts: ${[...CONCEPT_KEYS].join(', ')}
Alias phrases MUST be exact phrases from the query. Do not create new target keys.
Query: ${String(question || '').slice(0, 800)}`;
  const { data, source } = await callLlmJson(prompt, {
    system: 'You classify user intent into a closed taxonomy. Return valid JSON only.',
  });
  const result = validateLlmUnderstanding(question, data);
  if (!result || result.confidence < 0.55 || (!result.goals.length && !result.concepts.length)) {
    return {
      intent: learnedIntent,
      source: 'local',
      confidence: intentUnderstandingConfidence(learnedIntent),
    };
  }

  const intent = mergeIntent(learnedIntent, {
    goals: result.goals,
    concepts: result.concepts,
    signals: result.aliases.map((item) => item.alias),
  });
  if (source === 'partner' || source === 'gemini') {
    await persistAliases(question, result, source);
  }
  return { intent, source, confidence: result.confidence };
}

import { KASIF_GOALS } from './lexicon';
import { formatKasifGoalLabel } from './goalLabels';

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function themeTerms(goals, question) {
  const terms = new Set(
    normalize(question)
      .split(' ')
      .filter((term) => term.length >= 4)
  );
  for (const goal of goals) {
    terms.add(normalize(goal));
    const definition = KASIF_GOALS[goal];
    for (const term of definition?.evidence || []) terms.add(normalize(term));
    for (const group of definition?.queryGroups || []) {
      for (const term of group) terms.add(normalize(term));
    }
  }
  return [...terms].filter(Boolean);
}

export function buildProactiveThemes(interactions = []) {
  return (Array.isArray(interactions) ? interactions : []).flatMap((row) => {
    const goals = Array.isArray(row?.intent?.goals) ? row.intent.goals.filter(Boolean) : [];
    const packId = String(row?.intent?.packId || '').trim();
    const completed = Boolean(row?.funnel?.stages?.job_done);
    if (!completed && !packId) return [];
    if (!goals.length && !packId) return [];

    const excludedSlugs = new Set(
      [row?.funnel?.selected_tool?.slug, ...(Array.isArray(row?.source_ids) ? row.source_ids : [])]
        .filter(Boolean)
        .map(String)
    );
    return [
      {
        interactionId: row.id,
        at: row.created_at,
        goals,
        packId: packId || null,
        question: String(row.question || '').slice(0, 180),
        terms: themeTerms(goals, row.question),
        excludedSlugs,
      },
    ];
  });
}

function toolScore(tool, theme) {
  const haystack = normalize(`${tool?.name || ''} ${tool?.description || ''}`);
  let score = 0;
  for (const term of theme.terms) {
    if (!term || term.length < 3) continue;
    if (normalize(tool?.name).includes(term)) score += 4;
    else if (haystack.includes(term)) score += term.includes(' ') ? 3 : 1;
  }
  return score;
}

export function rankProactiveSuggestions(interactions, tools, { locale = 'tr', limit = 3 } = {}) {
  const themes = buildProactiveThemes(interactions);
  const candidates = [];

  for (const tool of Array.isArray(tools) ? tools : []) {
    let best = null;
    for (const theme of themes) {
      if (
        theme.excludedSlugs.has(String(tool?.slug || '')) ||
        theme.excludedSlugs.has(String(tool?.id || ''))
      )
        continue;
      if (new Date(tool?.created_at).getTime() <= new Date(theme.at).getTime()) continue;
      const score = toolScore(tool, theme);
      if (score >= 3 && (!best || score > best.score)) best = { theme, score };
    }
    if (!best) continue;
    const goal = best.theme.goals[0] || null;
    const suggestionKey = `${best.theme.interactionId}:${tool.slug}`;
    candidates.push({
      suggestionKey,
      tool: {
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        link: tool.link,
        description: String(tool.description || '').slice(0, 220),
      },
      context: {
        interactionId: best.theme.interactionId,
        at: best.theme.at,
        goal,
        goalLabel: goal ? formatKasifGoalLabel(goal, locale) : best.theme.packId,
        packId: best.theme.packId,
      },
      score: best.score,
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score || String(b.tool.id).localeCompare(String(a.tool.id)))
    .slice(0, limit);
}

/**
 * Live Kâşif evaluation against a running server + real catalog.
 * Usage: npm run kasif:evaluate
 * Env: KASIF_EVAL_URL (default http://127.0.0.1:3005)
 *      KASIF_EVAL_MAX_LATENCY_MS (default 5000)
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { KASIF_EVAL_CASES: cases } = require('./kasif-eval-cases.cjs');

const baseUrl = (process.env.KASIF_EVAL_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
const maxLatencyMs = Number(process.env.KASIF_EVAL_MAX_LATENCY_MS || 5000);

let failed = 0;

for (const evaluation of cases) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/kasif/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-kasif-evaluation': '1' },
      body: JSON.stringify({
        question: evaluation.question,
        history: evaluation.history || [],
        evaluation: true,
        locale: evaluation.locale || 'tr',
      }),
      signal: AbortSignal.timeout(maxLatencyMs + 1000),
    });
    const payload = await response.json();
    const latencyMs = Math.round(performance.now() - startedAt);
    const titles = (payload.sources || []).map((source) => source.title);
    const concepts = payload.intent?.concepts || [];
    const skipSources = Boolean(evaluation.skipSources);
    const relevant = skipSources
      ? true
      : (evaluation.expectedAny || []).some((title) => titles.includes(title));
    const topRelevant = skipSources
      ? true
      : (evaluation.expectedTop || []).includes(titles[0]);
    const goalMatched =
      !evaluation.expectedGoal || payload.intent?.goals?.includes(evaluation.expectedGoal);
    const priceMatched =
      !evaluation.expectedPrice || payload.intent?.pricePreference === evaluation.expectedPrice;
    const confidenceMatched = payload.confidence >= (evaluation.minConfidence || 0);
    const metaMatched = !evaluation.expectMeta || payload.meta === true;
    const softLandingMatched =
      !evaluation.expectSoftLanding ||
      payload.softLanding === true ||
      payload.metaKind === 'soft-landing';
    const addToolStatus = payload.addTool?.status || payload.intent?.addTool?.status || null;
    const addToolMatched =
      !evaluation.expectAddTool ||
      ((payload.metaKind === 'add-tool' ||
        payload.intent?.meta === 'add-tool' ||
        Boolean(payload.addTool)) &&
        (!evaluation.expectAddToolStatus || addToolStatus === evaluation.expectAddToolStatus));
    const forbiddenConcepts = evaluation.forbiddenConcepts || [];
    const conceptsClean = forbiddenConcepts.every((concept) => !concepts.includes(concept));
    const requiredConcepts = evaluation.requiredConcepts || [];
    const conceptsRequired = requiredConcepts.every((concept) => concepts.includes(concept));
    const passed =
      response.ok &&
      payload.grounded === true &&
      relevant &&
      topRelevant &&
      goalMatched &&
      priceMatched &&
      confidenceMatched &&
      metaMatched &&
      softLandingMatched &&
      addToolMatched &&
      conceptsClean &&
      conceptsRequired &&
      latencyMs <= maxLatencyMs;
    if (!passed) failed += 1;
    console.log(
      JSON.stringify({
        case: evaluation.name,
        passed,
        latencyMs,
        confidence: payload.confidence,
        intent: payload.intent,
        meta: payload.meta,
        softLanding: payload.softLanding,
        sources: titles,
        conceptsClean,
        error: payload.error,
      })
    );
  } catch (error) {
    failed += 1;
    console.log(JSON.stringify({ case: evaluation.name, passed: false, error: error.message }));
  }
}

if (failed > 0) {
  console.error(`Kâşif evaluation failed: ${failed}/${cases.length} cases.`);
  process.exitCode = 1;
} else {
  console.log(`Kâşif evaluation passed: ${cases.length}/${cases.length} cases.`);
}

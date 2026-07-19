const baseUrl = (process.env.KASIF_EVAL_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
const maxLatencyMs = Number(process.env.KASIF_EVAL_MAX_LATENCY_MS || 5000);

const cases = [
  {
    name: 'presentation',
    question: 'Ücretsiz sunum hazırlamak için araç öner',
    expectedAny: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedTop: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
  },
  {
    name: 'image-generation',
    question: 'Bir resim çizmek ve görsel üretmek istiyorum',
    expectedAny: ['Bing Image Creator', 'Leonardo AI', 'Midjourney'],
    expectedTop: ['Bing Image Creator', 'Leonardo AI', 'Midjourney'],
  },
  {
    name: 'coding',
    question: 'Kod yazmak ve yazılım geliştirmek için asistan öner',
    expectedAny: ['GitHub Copilot', 'Cursor', 'Tabnine', 'Codeium'],
    expectedTop: ['GitHub Copilot', 'Cursor', 'Tabnine', 'Codeium'],
  },
  {
    name: 'meeting',
    question: 'Toplantı notlarını otomatik çıkarmak istiyorum',
    expectedAny: ['Slack', 'Fireflies.ai', 'Otter.ai', 'Fathom'],
    expectedTop: ['Slack', 'Fireflies.ai', 'Otter.ai', 'Fathom'],
  },
];

let failed = 0;

for (const evaluation of cases) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/kasif/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: evaluation.question, history: [] }),
      signal: AbortSignal.timeout(maxLatencyMs + 1000),
    });
    const payload = await response.json();
    const latencyMs = Math.round(performance.now() - startedAt);
    const titles = (payload.sources || []).map((source) => source.title);
    const relevant = evaluation.expectedAny.some((title) => titles.includes(title));
    const topRelevant = evaluation.expectedTop.includes(titles[0]);
    const passed = response.ok && payload.grounded === true && relevant && topRelevant
      && latencyMs <= maxLatencyMs;
    if (!passed) failed += 1;
    console.log(JSON.stringify({
      case: evaluation.name,
      passed,
      latencyMs,
      confidence: payload.confidence,
      sources: titles,
      error: payload.error,
    }));
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

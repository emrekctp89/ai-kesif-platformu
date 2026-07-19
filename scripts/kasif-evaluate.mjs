const baseUrl = (process.env.KASIF_EVAL_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
const maxLatencyMs = Number(process.env.KASIF_EVAL_MAX_LATENCY_MS || 5000);

const cases = [
  {
    name: 'presentation',
    question: 'Ücretsiz sunum hazırlamak için araç öner',
    expectedAny: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedTop: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedGoal: 'presentation-creation',
    expectedPrice: 'free',
    minConfidence: 0.75,
  },
  {
    name: 'presentation-natural-language',
    question: 'Ücretsiz sunum için hangi araçlar gerekli?',
    expectedAny: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedTop: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedGoal: 'presentation-creation',
    expectedPrice: 'free',
    minConfidence: 0.75,
  },
  {
    name: 'presentation-follow-up',
    question: 'Peki bunlardan ücretsiz olanlar hangileri?',
    history: [
      { role: 'user', content: 'Sunum hazırlamak için araç öner' },
      { role: 'assistant', content: 'Platformdaki sunum araçlarını sıraladım.' },
    ],
    expectedAny: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedTop: ['Beautiful.ai', 'Gamma App', 'SlidesAI', 'Tome'],
    expectedGoal: 'presentation-creation',
    expectedPrice: 'free',
    minConfidence: 0.75,
  },
  {
    name: 'topic-switch-presentation-to-image',
    question: 'Hayır, bu kez görsel oluşturmak istiyorum',
    history: [
      { role: 'user', content: 'Ücretsiz sunum hazırlamak için araç öner' },
      { role: 'assistant', content: 'Platformdaki sunum araçlarını sıraladım.' },
    ],
    expectedAny: [
      'Bing Image Creator',
      'Leonardo AI',
      'Midjourney',
      'Craiyon (formerly DALL-E mini)',
      'SeaArt AI',
    ],
    expectedTop: [
      'Bing Image Creator',
      'Leonardo AI',
      'Midjourney',
      'Craiyon (formerly DALL-E mini)',
      'SeaArt AI',
    ],
    expectedGoal: 'image-generation',
    expectedPrice: 'free',
    minConfidence: 0.75,
  },
  {
    name: 'image-generation',
    question: 'Bir resim çizmek ve görsel üretmek istiyorum',
    expectedAny: [
      'Bing Image Creator',
      'Leonardo AI',
      'Midjourney',
      'Craiyon (formerly DALL-E mini)',
      'SeaArt AI',
    ],
    expectedTop: [
      'Bing Image Creator',
      'Leonardo AI',
      'Midjourney',
      'Craiyon (formerly DALL-E mini)',
      'SeaArt AI',
    ],
    expectedGoal: 'image-generation',
    minConfidence: 0.75,
  },
  {
    name: 'video-generation',
    question: 'Metinden video ve animasyon oluşturmak için bir AI aracı öner',
    expectedAny: [
      'Simplified AI Video Editor',
      'Kling AI',
      'Pictory',
      'Visla',
      'Veo 3 AI Video Generator',
      'Kaiber',
      'Pika',
      'Colossyan Creator',
      'Synthesia',
      'Runway',
    ],
    expectedTop: [
      'Simplified AI Video Editor',
      'Kling AI',
      'Pictory',
      'Visla',
      'Veo 3 AI Video Generator',
      'Kaiber',
      'Pika',
      'Colossyan Creator',
      'Synthesia',
      'Runway',
    ],
    expectedGoal: 'video-generation',
    minConfidence: 0.75,
  },
  {
    name: 'voice-generation',
    question: 'Metinden seslendirme ve yapay zeka sesi oluşturmak istiyorum',
    expectedAny: ['ElevenLabs', 'Lovo.ai', 'Murf AI', 'Coqui Studio'],
    expectedTop: ['ElevenLabs', 'Lovo.ai', 'Murf AI', 'Coqui Studio'],
    expectedGoal: 'voice-generation',
    minConfidence: 0.75,
  },
  {
    name: 'music-generation',
    question: 'Yapay zeka ile müzik ve şarkı üretmek için araç öner',
    expectedAny: ['Udio', 'Suno AI', 'AudioCraft', 'Amadeus AI'],
    expectedTop: ['Udio', 'Suno AI', 'AudioCraft', 'Amadeus AI'],
    expectedGoal: 'music-generation',
    minConfidence: 0.75,
  },
  {
    name: 'workflow-automation',
    question: 'Tekrarlayan işlerimi otomatikleştirecek bir AI ajanı ve workflow aracı öner',
    expectedAny: ['Automata', 'IFTTT Connect', 'Make', 'Zapier', 'Bardeen.ai', 'IFTTT'],
    expectedTop: ['Automata', 'IFTTT Connect', 'Make', 'Zapier', 'Bardeen.ai', 'IFTTT'],
    expectedGoal: 'workflow-automation',
    minConfidence: 0.75,
  },
  {
    name: 'data-analysis',
    question: 'CSV verilerimi analiz edip rapor ve grafik oluşturacak araç öner',
    expectedAny: ['Julius AI', 'Tableau', 'Zoho Analytics', 'Domo', 'Rose AI'],
    expectedTop: ['Julius AI', 'Tableau', 'Zoho Analytics', 'Domo', 'Rose AI'],
    expectedGoal: 'data-analysis',
    minConfidence: 0.75,
  },
  {
    name: 'coding',
    question: 'Kod yazmak ve yazılım geliştirmek için asistan öner',
    expectedAny: [
      'GitHub Copilot',
      'Cursor',
      'Tabnine',
      'Codeium',
      'AskCodi',
      'CodeGeeX',
      'CodePal',
      'Amazon CodeWhisperer',
    ],
    expectedTop: [
      'GitHub Copilot',
      'Cursor',
      'Tabnine',
      'Codeium',
      'AskCodi',
      'CodeGeeX',
      'CodePal',
      'Amazon CodeWhisperer',
    ],
    expectedGoal: 'coding-assistant',
    minConfidence: 0.75,
  },
  {
    name: 'meeting',
    question: 'Toplantı notlarını otomatik çıkarmak istiyorum',
    expectedAny: ['Slack', 'Fireflies.ai', 'Otter.ai', 'Fathom', 'Meeting Summary by Fireflies'],
    expectedTop: ['Slack', 'Fireflies.ai', 'Otter.ai', 'Fathom', 'Meeting Summary by Fireflies'],
    expectedGoal: 'meeting-notes',
    minConfidence: 0.75,
  },
];

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
      }),
      signal: AbortSignal.timeout(maxLatencyMs + 1000),
    });
    const payload = await response.json();
    const latencyMs = Math.round(performance.now() - startedAt);
    const titles = (payload.sources || []).map((source) => source.title);
    const relevant = evaluation.expectedAny.some((title) => titles.includes(title));
    const topRelevant = evaluation.expectedTop.includes(titles[0]);
    const goalMatched =
      !evaluation.expectedGoal || payload.intent?.goals?.includes(evaluation.expectedGoal);
    const priceMatched =
      !evaluation.expectedPrice || payload.intent?.pricePreference === evaluation.expectedPrice;
    const confidenceMatched = payload.confidence >= (evaluation.minConfidence || 0);
    const passed =
      response.ok &&
      payload.grounded === true &&
      relevant &&
      topRelevant &&
      goalMatched &&
      priceMatched &&
      confidenceMatched &&
      latencyMs <= maxLatencyMs;
    if (!passed) failed += 1;
    console.log(
      JSON.stringify({
        case: evaluation.name,
        passed,
        latencyMs,
        confidence: payload.confidence,
        intent: payload.intent,
        sources: titles,
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

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
    name: 'content-writing',
    question: 'SEO uyumlu blog yazısı ve pazarlama metni oluşturacak araç öner',
    expectedAny: ['Contenda', 'Content Edge', 'Contents.com', 'ClosersCopy', 'Jasper'],
    expectedTop: ['Contenda', 'Content Edge', 'Contents.com', 'ClosersCopy', 'Jasper'],
    expectedGoal: 'content-writing',
    minConfidence: 0.75,
  },
  {
    name: 'translation',
    question: 'Uzun bir metni Türkçeye çevirmek için yapay zeka aracı öner',
    expectedAny: ['OpenAI GPT-3', 'Google Bard', 'ElevenLabs'],
    expectedTop: ['OpenAI GPT-3', 'Google Bard', 'ElevenLabs'],
    expectedGoal: 'translation',
    minConfidence: 0.65,
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
  {
    name: 'logo-design',
    question: 'Markam için logo tasarlamak istiyorum',
    expectedAny: [
      'Looka',
      'Brandmark',
      'LogoMakr',
      'Designs.ai',
      'Hatchful',
      'Tailor Brands',
      'LogoAI',
      'Namecheap Logo Maker',
    ],
    expectedTop: [
      'Looka',
      'Brandmark',
      'LogoMakr',
      'Designs.ai',
      'Hatchful',
      'Tailor Brands',
      'LogoAI',
      'Namecheap Logo Maker',
    ],
    expectedGoal: 'logo-design',
    minConfidence: 0.65,
  },
  {
    name: 'seo-optimization',
    question: 'Sitem için SEO analizi ve anahtar kelime araçları öner',
    expectedAny: [
      'Surfer SEO',
      'SurferSEO',
      'Ahrefs',
      'SEMrush',
      'Semrush',
      'Moz',
      'Clearscope',
      'Frase',
      'MarketMuse',
      'GrowthBar',
      'Yoast SEO',
      'Keyword Tool',
    ],
    expectedTop: [
      'Surfer SEO',
      'SurferSEO',
      'Ahrefs',
      'SEMrush',
      'Semrush',
      'Moz',
      'Clearscope',
      'Frase',
      'MarketMuse',
      'GrowthBar',
      'Yoast SEO',
      'Keyword Tool',
    ],
    expectedGoal: 'seo-optimization',
    minConfidence: 0.65,
  },
  {
    name: 'email-writing',
    question: 'Soğuk e-posta kampanyası yazmak için araç öner',
    expectedAny: [
      'Lavender',
      'Instantly',
      'Smartwriter',
      'Copy.ai',
      'Jasper',
      'ClosersCopy',
      'Lyne.ai',
      'Regie.ai',
      'AnyLeads',
      'Writecream',
      'Seventh Sense',
      'TextExpander',
    ],
    expectedTop: [
      'Lavender',
      'Instantly',
      'Smartwriter',
      'Copy.ai',
      'Jasper',
      'ClosersCopy',
      'Lyne.ai',
      'Regie.ai',
      'AnyLeads',
      'Writecream',
      'Seventh Sense',
      'TextExpander',
    ],
    expectedGoal: 'email-writing',
    minConfidence: 0.65,
  },
  {
    name: 'customer-support',
    question: 'Müşteri destek ticket yanıtlarını otomatikleştiren bot öner',
    expectedAny: [
      'Zendesk AI',
      'Intercom',
      'Freshdesk',
      'Ada',
      'Forethought',
      'Ultimate.ai',
      'HelpScout',
      'Tidio',
    ],
    expectedTop: [
      'Zendesk AI',
      'Intercom',
      'Freshdesk',
      'Ada',
      'Forethought',
      'Ultimate.ai',
      'HelpScout',
      'Tidio',
    ],
    expectedGoal: 'customer-support',
    minConfidence: 0.6,
  },
  {
    name: 'ecommerce-copy',
    question: 'Mağaza için ürün açıklaması yazacak araç öner',
    expectedAny: [
      'Copy.ai',
      'Jasper',
      'Describely',
      'Hypotenuse AI',
      'Anyword',
      'Copysmith',
      'CopySmith',
      'Rytr',
      'Writesonic',
      'Peppertype.ai',
      'Algonomy',
    ],
    expectedTop: [
      'Copy.ai',
      'Jasper',
      'Describely',
      'Hypotenuse AI',
      'Anyword',
      'Copysmith',
      'CopySmith',
      'Rytr',
      'Writesonic',
      'Peppertype.ai',
      'Algonomy',
    ],
    expectedGoal: 'ecommerce-copy',
    minConfidence: 0.45,
  },
  {
    name: 'chatbot-assistant',
    question: 'Gündelik sorular için sohbet asistanı öner',
    expectedAny: [
      'ChatGPT',
      'Claude',
      'Gemini',
      'Google Gemini',
      'Perplexity',
      'Perplexity AI',
      'Microsoft Copilot',
      'Poe',
      'Pi',
      'YouChat',
      'Character AI',
    ],
    expectedTop: [
      'ChatGPT',
      'Claude',
      'Gemini',
      'Google Gemini',
      'Perplexity',
      'Perplexity AI',
      'Microsoft Copilot',
      'Poe',
      'Pi',
      'YouChat',
      'Character AI',
    ],
    expectedGoal: 'chatbot-assistant',
    minConfidence: 0.6,
  },
  {
    name: 'legal-review',
    question: 'Hukuki sözleşme incelemek için AI aracı öner',
    expectedAny: [
      'Harvey',
      'Harvey AI',
      'Spellbook',
      'Lawgeex',
      'Casetext',
      'DoNotPay',
      'Robin AI',
      'Lexis+',
      'Ironclad',
      'AI Lawyer',
    ],
    expectedTop: [
      'Harvey',
      'Harvey AI',
      'Spellbook',
      'Lawgeex',
      'Casetext',
      'DoNotPay',
      'Robin AI',
      'Lexis+',
      'Ironclad',
      'AI Lawyer',
    ],
    expectedGoal: 'legal-review',
    minConfidence: 0.55,
  },
  {
    name: 'three-d-generation',
    question: 'Metinden 3D model ve avatar oluşturmak istiyorum',
    expectedAny: [
      'Meshy',
      'Luma AI',
      'Kaedim',
      'CSM',
      'Rodin',
      'Alpha3D',
      'Spline',
      'Scenario',
      'Masterpiece Studio',
    ],
    expectedTop: [
      'Meshy',
      'Luma AI',
      'Kaedim',
      'CSM',
      'Rodin',
      'Alpha3D',
      'Spline',
      'Scenario',
      'Masterpiece Studio',
    ],
    expectedGoal: 'three-d-generation',
    minConfidence: 0.55,
  },
  {
    name: 'price-follow-up-paid',
    question: 'Bu kez ücretli seçenekleri göster',
    history: [
      { role: 'user', content: 'Kod yazmak için asistan öner' },
      { role: 'assistant', content: 'Platformdaki kod asistanlarını sıraladım.' },
    ],
    expectedAny: [
      'GitHub Copilot',
      'Cursor',
      'Tabnine',
      'Codeium',
      'AskCodi',
      'CodeGeeX',
      'CodePal',
      'Amazon CodeWhisperer',
      'TabbyML',
      'Replit Ghostwriter',
      'Sourcegraph Cody',
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
      'TabbyML',
      'Replit Ghostwriter',
      'Sourcegraph Cody',
    ],
    expectedGoal: 'coding-assistant',
    expectedPrice: 'paid',
    minConfidence: 0.65,
  },
  {
    name: 'meta-identity',
    question: 'Sen kimsin?',
    expectMeta: true,
    minConfidence: 0.9,
    skipSources: true,
  },
  {
    name: 'soft-landing-contextless',
    question: 'Peki bunlardan ücretsiz olanlar hangileri?',
    expectSoftLanding: true,
    expectedPrice: 'free',
    minConfidence: 0.85,
    skipSources: true,
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
        locale: evaluation.locale || 'tr',
      }),
      signal: AbortSignal.timeout(maxLatencyMs + 1000),
    });
    const payload = await response.json();
    const latencyMs = Math.round(performance.now() - startedAt);
    const titles = (payload.sources || []).map((source) => source.title);
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

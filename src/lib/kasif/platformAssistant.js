/** Platform help uses verified product rules and does not need a model call. */
export function answerPlatformQuestion(question, locale = 'tr') {
  const q = String(question || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ı', 'i');
  let topic = null;
  if (
    /workmind|is paket|job pack|pro uyelik|pro membership|pro plan|uyelik.*(nasil|nedir|icer|kaps)|membership.*(include|work|what)/.test(
      q
    )
  )
    topic = 'pro';
  else if (/kategoriler|kategorileri|categories/.test(q)) topic = 'categories';
  else if (/favori.*(nasil|nerede)|koleksiyon.*(nasil|nedir)|how.*(favorite|collection)/.test(q))
    topic = 'collections';
  else if (
    /bu (site|platform|sistem)|ai kesif.*(nedir|nasil)|what.*(platform|ai kesif)|kasif.*(nedir|nasil|yapar)|what.*kasif/.test(
      q
    )
  )
    topic = 'about';
  if (!topic) return null;
  const answers =
    locale === 'en'
      ? {
          pro: 'WorkMind and all Kâşif job packs are included in PRO membership. WorkMind creates step-by-step workflows; job packs produce task-specific outputs. Basic Kâşif chat about the platform is available to everyone. Open Membership to review the plan and upgrade.',
          categories:
            'Categories group the platform’s AI tools by purpose, such as image generation, coding, writing and education. Open Categories from the discovery menu, choose a category and compare the tools. Category names and descriptions are available in English on /en.',
          collections:
            'Sign in to save tools as favorites and organize them into collections. Your saved tools help you return to useful resources from your profile.',
          about:
            'AI Keşif helps you discover and compare AI tools, explore categories, read guides and join the community. I am Kâşif, your platform assistant: ask me how the site works or where to find a feature. WorkMind and job packs require PRO; this chat is open to everyone.',
        }
      : {
          pro: 'WorkMind ve Kâşif’in tüm iş paketleri PRO üyeliğe dahildir. WorkMind hedefini adım adım iş akışına dönüştürür; iş paketleri belirli görevler için çıktı üretir. Kâşif’in platform hakkında temel sohbeti herkese açıktır. Planı incelemek ve yükseltmek için Üyelik sayfasını açabilirsin.',
          categories:
            'Kategoriler, platformdaki AI araçlarını görsel üretim, kodlama, yazarlık ve eğitim gibi amaçlara göre gruplar. Keşif menüsünden Kategoriler’i aç, bir kategori seç ve araçları karşılaştır. /en tarafında kategori adları ve açıklamaları İngilizcedir.',
          collections:
            'Araçları favorilerine eklemek ve koleksiyonlarda düzenlemek için giriş yap. Kaydettiğin araçlara profilinden dönerek yararlı kaynaklarını bir arada tutabilirsin.',
          about:
            'AI Keşif; yapay zeka araçlarını keşfetmene, karşılaştırmana, kategorileri ve rehberleri incelemene, topluluğa katılmana yardımcı olur. Ben Kâşif, platformun sohbet asistanıyım: sistemin nasıl çalıştığını veya bir özelliği nerede bulacağını sorabilirsin. WorkMind ve iş paketleri PRO gerektirir; bu sohbet herkese açıktır.',
        };
  return {
    answer: answers[topic],
    sourceIds: [],
    confidence: 0.99,
    meta: true,
    metaKind: 'platform',
    insufficientContext: false,
    intent: { meta: 'platform', goals: [], concepts: [] },
  };
}

const text = (tr, en) => ({ tr, en });

// Each route ends in a small, reviewable artifact rather than a tool subscription.
export const LEARNING_JOURNEYS = [
  {
    id: 'chatbotlar',
    level: 'beginner',
    minutes: 20,
    title: text('AI asistanıyla ilk çalışma', 'Your first AI assistant session'),
    outcome: text(
      'Kaynakları kontrol edilmiş bir özet ve takip soruları.',
      'A checked summary and useful follow-up questions.'
    ),
    concept: text(
      'İyi bir istek; amaç, bağlam, kısıt ve çıktı biçimini açıklar. Asistanın kendinden emin olması doğruluk kanıtı değildir. Kişisel veya gizli verileri paylaşmadan önce kaldır.',
      'A useful request states the goal, context, constraints and output format. Confidence is not evidence of accuracy. Remove personal or confidential data before sharing.'
    ),
    exercise: text(
      'Kamuya açık kısa bir yazı seç. Beş maddelik özet iste, ardından iki iddiayı özgün metinle karşılaştır.',
      'Choose a short public article. Request a five-point summary, then compare two claims with the original text.'
    ),
    prompt: text(
      'Aşağıdaki metni yalnızca verilen bilgilere dayanarak 5 maddede özetle. Her madde için metindeki dayanağı belirt. Belirsiz bilgileri “doğrulanmalı” diye işaretle. Metin: [metni ekle]',
      'Summarize the following text in five points using only the supplied information. Identify the supporting passage for each point. Flag uncertain information as “needs verification”. Text: [paste text]'
    ),
    checks: [
      text('İki iddiayı kaynakla karşılaştırdım.', 'I checked two claims against the source.'),
      text('Özeti kendi cümlelerimle düzelttim.', 'I revised the summary in my own words.'),
    ],
    question: text(
      'Asistanın yanıtına güvenmeden önce ne yaparsın?',
      'What should you do before trusting an assistant’s answer?'
    ),
    options: [
      text(
        'Önemli iddiaları özgün kaynakla doğrularım.',
        'Verify important claims against original sources.'
      ),
      text('Yanıt uzunsa doğru kabul ederim.', 'Assume a long answer is correct.'),
    ],
  },
  {
    id: 'metin-yazarligi',
    level: 'beginner',
    minutes: 25,
    title: text('Taslağı yayına hazır metne dönüştür', 'Turn a draft into publishable writing'),
    outcome: text(
      'Hedef kitleye uygun, düzenlenmiş 150 kelimelik metin.',
      'An edited 150-word piece for a defined audience.'
    ),
    concept: text(
      'Önce hedef kitleyi ve mesajı belirle, sonra taslak iste. Tek seferde kusursuz metin beklemek yerine yapı, doğruluk ve üslubu ayrı turlarda düzenle.',
      'Define the audience and message before requesting a draft. Edit structure, accuracy and tone in separate passes rather than expecting a perfect first draft.'
    ),
    exercise: text(
      'Hayali bir ürün için 150 kelimelik tanıtım yaz. Abartılı iddiaları kaldır ve açık bir sonraki adım ekle.',
      'Write a 150-word introduction for a fictional product. Remove exaggerated claims and add a clear next step.'
    ),
    prompt: text(
      'Hedef kitle: [kitle]. Ana mesaj: [mesaj]. 150 kelimelik bir tanıtım taslağı yaz. Ton sade ve somut olsun. Doğrulanmamış başarı, sayı veya müşteri iddiası ekleme. Sonunda tek bir eylem çağrısı olsun.',
      'Audience: [audience]. Main message: [message]. Draft a 150-word introduction in a clear, concrete tone. Do not invent results, numbers or customer claims. End with one call to action.'
    ),
    checks: [
      text('Uydurma iddia ve sayıları çıkardım.', 'I removed invented claims and numbers.'),
      text(
        'Metni sesli okuyup gereksiz cümleleri kısalttım.',
        'I read the text aloud and trimmed unnecessary sentences.'
      ),
    ],
    question: text(
      'Taslakta kaynağı olmayan bir başarı oranı varsa?',
      'What if a draft includes an unsupported success rate?'
    ),
    options: [
      text('Kaynak bulur veya iddiayı çıkarırım.', 'Find evidence or remove the claim.'),
      text('Daha etkileyici olduğu için tutarım.', 'Keep it because it sounds impressive.'),
    ],
  },
  {
    id: 'gorsel-uretim',
    level: 'beginner',
    minutes: 25,
    title: text('Tutarlı bir görsel brief oluştur', 'Create a consistent visual brief'),
    outcome: text(
      'İki görsel varyasyonu ve seçim gerekçesi.',
      'Two visual variations and a reasoned selection.'
    ),
    concept: text(
      'Görsel promptunda konu, kompozisyon, ışık, stil ve oranı tanımla. Karşılaştırırken tek bir değişkeni değiştir. Üretim aracının kullanım ve lisans koşullarını kontrol et.',
      'Describe the subject, composition, lighting, style and aspect ratio. Change one variable at a time when comparing results. Check the tool’s usage and licensing terms.'
    ),
    exercise: text(
      'Hayali bir kahve markası için kare bir görsel üret. Aynı brief ile ışığı değiştirerek ikinci varyasyonu al.',
      'Create a square visual for a fictional coffee brand. Keep the brief and change only the lighting for a second variation.'
    ),
    prompt: text(
      'Kare ürün görseli: sade seramik fincan, ahşap masa, sıcak sabah ışığı, doğal renkler, ortalanmış kompozisyon, çevresinde boş alan. Yazı veya logo ekleme. Stil: gerçekçi ürün fotoğrafı.',
      'Square product visual: a simple ceramic cup on a wooden table, warm morning light, natural colors, centered composition with negative space. No text or logos. Style: realistic product photography.'
    ),
    checks: [
      text(
        'İki varyasyonu aynı ölçütlerle karşılaştırdım.',
        'I compared both variations using the same criteria.'
      ),
      text(
        'Görsel hatalarını ve kullanım koşullarını kontrol ettim.',
        'I checked visual defects and usage terms.'
      ),
    ],
    question: text(
      'Hangi yöntem iki denemeyi karşılaştırmayı kolaylaştırır?',
      'What makes two experiments easier to compare?'
    ),
    options: [
      text('Tek bir değişkeni değiştiririm.', 'Change one variable at a time.'),
      text(
        'Her denemede bütün briefi değiştiririm.',
        'Change the entire brief for each experiment.'
      ),
    ],
  },
  {
    id: 'video-uretim',
    level: 'intermediate',
    minutes: 35,
    title: text('Kısa video için hikâye panosu', 'Storyboard a short video'),
    outcome: text(
      'Üç sahnelik plan ve 10 saniyelik deneme klibi.',
      'A three-scene plan and a ten-second test clip.'
    ),
    concept: text(
      'Video üretiminden önce sahneleri planla. Konu, hareket, kamera ve süreyi ayrı tanımla. Kısa denemelerle tutarlılığı kontrol etmek uzun bir üretimi tekrarlamaktan daha verimlidir.',
      'Plan scenes before generating video. Specify the subject, motion, camera and duration separately. Short tests make consistency checks easier than regenerating a long video.'
    ),
    exercise: text(
      'Bir masa lambası için üç sahnelik tanıtım planla. İlk sahneyi üret veya karelerle bir animatik hazırla.',
      'Plan a three-scene introduction for a desk lamp. Generate the first scene or create an animatic from still frames.'
    ),
    prompt: text(
      '10 saniyelik ürün tanıtımı için 3 sahnelik hikâye panosu oluştur. Ürün: [ürün]. Her sahnede süre, kamera açısı, hareket ve anlatılacak mesaj olsun. Metin veya müzik gerekiyorsa ayrı belirt.',
      'Create a three-scene storyboard for a ten-second product introduction. Product: [product]. Include duration, camera angle, motion and message for each scene. List any text or music separately.'
    ),
    checks: [
      text('Sahne süreleri hedef süreye uyuyor.', 'Scene durations match the target length.'),
      text(
        'Geçişleri ve ürünün görsel tutarlılığını kontrol ettim.',
        'I checked transitions and product consistency.'
      ),
    ],
    question: text(
      'İlk video denemesi için en yararlı başlangıç?',
      'What is the most useful start for a video test?'
    ),
    options: [
      text('Net bir sahne planı ve kısa deneme.', 'A clear storyboard and a short test.'),
      text('Sahne planı olmadan uzun video.', 'A long video without a scene plan.'),
    ],
  },
  {
    id: 'kod-yazilim',
    level: 'intermediate',
    minutes: 35,
    title: text(
      'Kod asistanıyla güvenli küçük değişiklik',
      'Make a small change with a coding assistant'
    ),
    outcome: text(
      'İncelenmiş küçük bir işlev ve sınır durum testleri.',
      'A reviewed small function and edge-case tests.'
    ),
    concept: text(
      'Asistana küçük ve doğrulanabilir bir görev ver. Üretilen kodu çalıştırmadan önce oku; bağımlılıkları ve veri erişimini kontrol et. API anahtarlarını veya üretim verilerini prompta koyma.',
      'Give the assistant a small, verifiable task. Read generated code before running it and inspect dependencies and data access. Never paste API keys or production data into prompts.'
    ),
    exercise: text(
      'Bir metindeki kelimeleri sayan işlev yazdır. Boş metin, fazla boşluk ve farklı satırlar için test ekle.',
      'Create a function that counts words in a string. Add tests for empty input, extra spaces and multiple lines.'
    ),
    prompt: text(
      '[dil] dilinde bir metnin kelime sayısını hesaplayan saf bir işlev yaz. Boş girdi ve ardışık boşlukları ele al. Ek bağımlılık kullanma. Önce yaklaşımı açıkla, sonra işlevi ve 3 sınır durum testini göster.',
      'Write a pure function in [language] to count words in a string. Handle empty input and repeated whitespace without extra dependencies. Explain the approach, then show the function and three edge-case tests.'
    ),
    checks: [
      text('Kodun her bölümünü okuyup anladım.', 'I read and understood each part of the code.'),
      text('Sınır durum testlerini çalıştırdım.', 'I ran the edge-case tests.'),
    ],
    question: text('Üretilen kodu kullanmadan önce?', 'Before using generated code, you should…'),
    options: [
      text('İnceler, güvenli ortamda test ederim.', 'Review it and test in a safe environment.'),
      text('Doğrudan üretime kopyalarım.', 'Copy it directly into production.'),
    ],
  },
  {
    id: 'pazarlama',
    level: 'intermediate',
    minutes: 30,
    title: text('Ölçülebilir bir içerik kampanyası', 'Plan a measurable content campaign'),
    outcome: text(
      'Üç içeriklik plan, tek hedef ve ölçüm kriteri.',
      'A three-post plan with one goal and a measurement criterion.'
    ),
    concept: text(
      'İçerik planını tek bir hedefe bağla: görünürlük, ziyaret veya başvuru. AI çıktısındaki anahtar kelime hacmi gibi sayıları gerçek veri olmadan doğru kabul etme.',
      'Connect the plan to one goal: reach, visits or enquiries. Do not accept AI-generated numbers such as keyword volumes without real supporting data.'
    ),
    exercise: text(
      'Hayali bir atölye için bir haftalık üç içerik planla. Her içerikte hedef kitle, mesaj, CTA ve başarı ölçütü belirt.',
      'Plan three posts for a fictional workshop over one week. Define the audience, message, CTA and success criterion for each.'
    ),
    prompt: text(
      '[ürün/hizmet] için bir haftalık 3 içerik planı oluştur. Hedef: [tek hedef]. Her satırda konu, format, hedef kitle, eylem çağrısı ve ölçülecek metrik olsun. Anahtar kelime hacmi veya performans sayısı uydurma.',
      'Create a one-week, three-post content plan for [product/service]. Goal: [one goal]. Include topic, format, audience, call to action and metric for each post. Do not invent keyword volumes or performance figures.'
    ),
    checks: [
      text(
        'Her içerik aynı kampanya hedefine bağlı.',
        'Each post supports the same campaign goal.'
      ),
      text(
        'Bir başarı ölçütü ve değerlendirme tarihi belirledim.',
        'I set a success criterion and a review date.'
      ),
    ],
    question: text(
      'AI tarafından verilen arama hacmini nasıl kullanırsın?',
      'How should you use AI-generated search volume?'
    ),
    options: [
      text('Bir veri kaynağıyla doğruladıktan sonra.', 'Only after checking a data source.'),
      text('Tahmini doğrudan rapora eklerim.', 'Add the estimate directly to a report.'),
    ],
  },
  {
    id: 'uretkenlik',
    level: 'beginner',
    minutes: 20,
    title: text('Notlardan uygulanabilir görevlere', 'Turn notes into actionable tasks'),
    outcome: text(
      'Sorumlusu ve tarihi belirlenmiş görev listesi.',
      'A task list with owners and dates.'
    ),
    concept: text(
      'Özet ile görev listesi farklı çıktılardır. Görevlerde eylem, sorumlu ve tarih gerekir. Notlarda geçmeyen kişi ve tarihleri uydurmak yerine eksik olarak işaretle.',
      'A summary and a task list are different outputs. Tasks need an action, owner and date. Mark missing owners or dates rather than inventing them.'
    ),
    exercise: text(
      'Hayali toplantı notları yaz. Bunları görev tablosuna dönüştür ve eksik sorumluları belirle.',
      'Write fictional meeting notes. Convert them into a task table and identify missing owners.'
    ),
    prompt: text(
      'Aşağıdaki notları görev tablosuna dönüştür: eylem, sorumlu, son tarih, belirsizlik. Notta bulunmayan kişi ve tarihleri “belirlenmedi” yaz. En sonda netleştirilmesi gereken 3 soru ekle. Notlar: [anonim notlar]',
      'Convert the notes below into a task table: action, owner, deadline, uncertainty. Write “not assigned” for owners or dates absent from the notes. End with three clarification questions. Notes: [anonymized notes]'
    ),
    checks: [
      text('Notlarda olmayan kişi ve tarihleri uydurmadım.', 'I did not invent owners or dates.'),
      text('Her görev somut bir eylemle başlıyor.', 'Each task starts with a concrete action.'),
    ],
    question: text(
      'Notta son tarih yoksa ne yapmalısın?',
      'What should you do if the notes have no deadline?'
    ),
    options: [
      text('Eksik olarak işaretler ve sorarım.', 'Mark it missing and ask for clarification.'),
      text('Rastgele bir tarih eklerim.', 'Add a random date.'),
    ],
  },
  {
    id: 'ses-muzik',
    level: 'intermediate',
    minutes: 30,
    title: text('Kısa bir ses projesi hazırla', 'Prepare a short audio project'),
    outcome: text(
      '20 saniyelik metin, ses denemesi ve kontrol listesi.',
      'A twenty-second script, audio test and review checklist.'
    ),
    concept: text(
      'Ses üretiminde önce metni ve süreyi netleştir. Telaffuz, duraklama ve ses seviyesini dinleyerek değerlendir. Başkasının sesini klonlamak için açık izin ve uygun kullanım hakları gerekir.',
      'Define the script and duration first. Listen for pronunciation, pauses and volume. Cloning another person’s voice requires explicit permission and appropriate usage rights.'
    ),
    exercise: text(
      'Hayali bir podcast için 20 saniyelik giriş yaz. Lisanslı bir sesle dene veya kendin oku; telaffuz hatalarını not et.',
      'Write a twenty-second intro for a fictional podcast. Test with a licensed voice or record yourself, then note pronunciation errors.'
    ),
    prompt: text(
      '[konu] üzerine bir podcast için yaklaşık 20 saniyelik giriş metni yaz. Kısa cümleler, doğal konuşma ve bir açılış sorusu kullan. Seslendirme için duraklamaları işaretle. Gerçek kişi taklidi isteme.',
      'Write an approximately twenty-second podcast intro about [topic]. Use short sentences, natural speech and an opening question. Mark pauses for narration. Do not request impersonation of a real person.'
    ),
    checks: [
      text(
        'Metni sesli okuyup süreyi ölçtüm.',
        'I read the script aloud and measured its duration.'
      ),
      text(
        'Sesin kullanım hakkını ve telaffuzunu kontrol ettim.',
        'I checked voice rights and pronunciation.'
      ),
    ],
    question: text(
      'Gerçek bir kişinin sesini klonlamadan önce?',
      'Before cloning a real person’s voice, you need…'
    ),
    options: [
      text('Açık izin ve kullanım hakkı.', 'Explicit permission and usage rights.'),
      text('İnternette bir ses kaydı yeterli.', 'Any recording found online.'),
    ],
  },
];

export const LEARN_STORAGE_KEY = 'ai-kesif-learning-v1';
export const LESSON_IDS = ['understand', 'practice', 'review'];
export function localText(value, locale) {
  return value?.[locale === 'en' ? 'en' : 'tr'] || '';
}
export function lessonKey(route, lesson) {
  return `${route}:${lesson}`;
}
export function normalizeLearningState(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const ids = new Set(LEARNING_JOURNEYS.map((route) => route.id));
  const keys = new Set([...ids].flatMap((id) => LESSON_IDS.map((lesson) => lessonKey(id, lesson))));
  return {
    completed: Object.fromEntries(
      Object.entries(source.completed || {}).filter(([key, val]) => keys.has(key) && val === true)
    ),
    saved: Array.isArray(source.saved)
      ? [...new Set(source.saved.filter((id) => ids.has(id)))]
      : [],
    notes: Object.fromEntries(
      Object.entries(source.notes || {})
        .filter(([id, note]) => ids.has(id) && typeof note === 'string')
        .map(([id, note]) => [id, note.slice(0, 3000)])
    ),
    active: ids.has(source.active) ? source.active : null,
    lesson: LESSON_IDS.includes(source.lesson) ? source.lesson : 'understand',
  };
}
export function filterJourneys(
  routes,
  { query = '', level = 'all', duration = 'all', savedOnly = false, saved = [] } = {},
  locale = 'tr'
) {
  const normalize = (s) =>
    String(s)
      .toLocaleLowerCase('tr-TR')
      .replaceAll('ı', 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return routes.filter(
    (route) =>
      (level === 'all' || route.level === level) &&
      (duration !== 'short' || route.minutes <= 25) &&
      (!savedOnly || saved.includes(route.id)) &&
      terms.every((term) =>
        normalize(`${localText(route.title, locale)} ${localText(route.outcome, locale)}`).includes(
          term
        )
      )
  );
}

/**
 * Detect “add this tool to the catalog” intents from Kâşif chat.
 * Queueing (scrape → is_approved=false) is handled server-side with admin gate.
 */

function normalizeForMatch(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9:\/\.\-\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ADD_TOOL_PHRASES =
  /\b(bu araci ekle|araci ekle|kataloga ekle|kataloga ekle|arac ekle|incele ve ekle|aday olarak ekle|add this tool|add the tool|add tool|submit (this )?tool|catalog (this )?tool|scrape (this )?url|suggest (this )?tool)\b/i;

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const BARE_DOMAIN_RE =
  /(?:^|\s)((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})(?:\/[^\s]*)?/i;

/**
 * @param {string} question
 * @returns {{ isAddTool: boolean, url: string|null, reason: string|null }}
 */
export function detectAddToolIntent(question) {
  const raw = String(question || '').trim();
  if (!raw) return { isAddTool: false, url: null, reason: null };

  const normalized = normalizeForMatch(raw);
  const hasPhrase = ADD_TOOL_PHRASES.test(normalized) || ADD_TOOL_PHRASES.test(raw);
  const urls = raw.match(URL_RE) || [];
  let url = urls[0] ? urls[0].replace(/[.,;:!?)]+$/, '') : null;

  if (!url && hasPhrase) {
    const bare = raw.match(BARE_DOMAIN_RE);
    if (bare?.[1] && !/^(www\.)?(example|localhost)\b/i.test(bare[1])) {
      url = `https://${bare[1]}${bare[0].includes('/') ? bare[0].trim().slice(bare[1].length) : ''}`;
    }
  }

  // URL + soft “add/suggest/incele” cues without full phrase
  const softAdd =
    Boolean(url) &&
    /\b(ekle|ekleyin|incele|katalog|catalog|submit|suggest|scrape|aday)\b/i.test(normalized);

  if (!hasPhrase && !softAdd) {
    return { isAddTool: false, url: null, reason: null };
  }

  if (!url) {
    return { isAddTool: true, url: null, reason: 'missing_url' };
  }

  return { isAddTool: true, url, reason: 'ready' };
}

/**
 * User-facing answer when add-tool intent is handled (no queue yet).
 */
export function answerAddToolPrompt(locale = 'tr', detection = {}) {
  const lang = locale === 'en' ? 'en' : 'tr';
  if (detection.reason === 'missing_url') {
    return lang === 'en'
      ? `I can queue a catalog candidate for admin review — but I need the **official product URL**.

Example:
• Add this tool https://example-product.com

I only accept official product sites (not directories). After scrape, the tool stays **unapproved** until an admin reviews it.`
      : `Kataloga aday ekleyebilirim (admin onayı gerekir) — bunun için **resmî ürün URL’si** lazım.

Örnek:
• Bu aracı ekle https://ornek-urun.com

Yalnızca resmî ürün siteleri kabul edilir (dizin siteleri değil). Scrape sonrası kayıt **onaysız** kalır; admin inceler.`;
  }

  return lang === 'en' ? 'Preparing catalog candidate…' : 'Katalog adayı hazırlanıyor…';
}

/**
 * Build chat answer after queue attempt.
 * @param {{ ok: boolean, status?: string, error?: string, candidate?: object, inserted?: object, duplicates?: object }} result
 * @param {string} [locale]
 */
export function formatAddToolResultAnswer(result, locale = 'tr') {
  const lang = locale === 'en' ? 'en' : 'tr';
  if (!result?.ok) {
    const err =
      result?.error || (lang === 'en' ? 'Could not queue the tool.' : 'Aday kuyruğa alınamadı.');
    return lang === 'en'
      ? `I couldn’t add that tool as a candidate.\n\nReason: ${err}\n\nTips: use the official product homepage (not Product Hunt / directories), and try again.`
      : `Bu aracı aday olarak ekleyemedim.\n\nNeden: ${err}\n\nİpucu: resmî ürün ana sayfasını kullan (Product Hunt / dizin değil) ve tekrar dene.`;
  }

  const name = result.candidate?.name || result.inserted?.name || (lang === 'en' ? 'Tool' : 'Araç');
  const link = result.candidate?.link || result.inserted?.link || '';
  const slug = result.inserted?.slug || '';

  if (result.status === 'duplicate') {
    return lang === 'en'
      ? `**${name}** already looks like it’s in the catalog${link ? ` (${link})` : ''}.\n\nNo new candidate was created. An admin can still review pending tools if needed.`
      : `**${name}** katalogda zaten var gibi görünüyor${link ? ` (${link})` : ''}.\n\nYeni aday oluşturulmadı. Gerekirse admin bekleyen araçları yine de inceleyebilir.`;
  }

  return lang === 'en'
    ? `Queued **${name}** for admin review (not published yet).${link ? `\nLink: ${link}` : ''}${
        slug ? `\nDraft slug: \`${slug}\`` : ''
      }

**Review SLA:** typically **1–3 business days** (best effort, not a guarantee).

What happens next:
1. Admin opens the pending tools queue
2. Reviews description / link / category
3. Approves → it becomes recommendable in Kâşif

Later you can ask **“check my tool status”** (or paste the URL/slug again).

I never auto-publish scraped tools.`
    : `**${name}** admin inceleme kuyruğuna alındı (henüz yayında değil).${link ? `\nBağlantı: ${link}` : ''}${
        slug ? `\nTaslak slug: \`${slug}\`` : ''
      }

**İnceleme SLA:** genelde **1–3 iş günü** (hedef; garanti değil).

Sonraki adımlar:
1. Admin bekleyen araçlar kuyruğunu açar
2. Açıklama / link / kategoriyi inceler
3. Onaylarsa Kâşif önermeye başlar

Sonra **“durumumu sor”** yazabilirsin (veya URL/slug’ı tekrar yapıştır).

Scrape edilen araçlar asla otomatik yayınlanmaz.`;
}

/** Short SLA line for UI chips (not full answer). */
export function addToolSlaCopy(locale = 'tr') {
  return locale === 'en'
    ? 'Review SLA: typically 1–3 business days (best effort).'
    : 'İnceleme SLA: genelde 1–3 iş günü (hedef; garanti değil).';
}

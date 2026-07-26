/**
 * “Durumumu sor” follow-up for Kâşif add-tool queue candidates.
 * Looks up tools by URL/slug from the question or recent chat history.
 */

function normalizeForMatch(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9:\/\.\-\s_`]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STATUS_PHRASES =
  /\b(durumumu sor|durumumu ogren|durum ne|ne durumda|kuyruk durumu|aday durumu|ekledigim arac|ekledigim aracın durumu|onay durumu|inceleme durumu|tool status|status of (my )?tool|check (my )?tool|my (tool )?status|queue status|review status|is (it|my tool) approved|was (it|my tool) approved)\b/i;

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const SLUG_RE = /(?:slug|taslak slug|draft slug)[:\s`]*([a-z0-9][a-z0-9-]{1,80})/i;
const BARE_SLUG_RE = /`([a-z0-9][a-z0-9-]{1,80})`/;

/**
 * @param {string} question
 * @returns {{ isStatus: boolean, url: string|null, slug: string|null }}
 */
export function detectAddToolStatusIntent(question) {
  const raw = String(question || '').trim();
  if (!raw) return { isStatus: false, url: null, slug: null };

  const normalized = normalizeForMatch(raw);
  const hasPhrase = STATUS_PHRASES.test(normalized) || STATUS_PHRASES.test(raw);
  if (!hasPhrase) return { isStatus: false, url: null, slug: null };

  const urls = raw.match(URL_RE) || [];
  const url = urls[0] ? urls[0].replace(/[.,;:!?)]+$/, '') : null;
  const slugMatch = raw.match(SLUG_RE) || raw.match(BARE_SLUG_RE);
  const slug = slugMatch?.[1] ? String(slugMatch[1]).toLowerCase() : null;

  return { isStatus: true, url, slug };
}

/**
 * Pull candidate URL / draft slug from recent chat (user + assistant turns).
 * @param {Array<{ role?: string, content?: string }>} history
 * @returns {{ url: string|null, slug: string|null }}
 */
export function extractAddToolRefsFromHistory(history = []) {
  const list = Array.isArray(history) ? history.slice().reverse() : [];
  let url = null;
  let slug = null;

  for (const message of list) {
    const content = String(message?.content || '');
    if (!content) continue;

    if (!url) {
      const urls = content.match(URL_RE) || [];
      if (urls[0]) url = urls[0].replace(/[.,;:!?)]+$/, '');
    }

    if (!slug) {
      const slugMatch = content.match(SLUG_RE) || content.match(BARE_SLUG_RE);
      if (slugMatch?.[1]) slug = String(slugMatch[1]).toLowerCase();
    }

    // Prefer turns that look like add-tool outcomes.
    const looksAddTool =
      /admin inceleme|kuyruğa alındı|queued|is_approved|onaysız|catalog candidate|aday/i.test(
        content
      );
    if (looksAddTool && (url || slug)) break;
    if (url && slug) break;
  }

  return { url, slug };
}

/**
 * @param {{ is_approved?: boolean, name?: string, slug?: string, link?: string, created_at?: string }|null} tool
 * @returns {'approved'|'pending'|'not_found'}
 */
export function classifyToolQueueStatus(tool) {
  if (!tool) return 'not_found';
  if (tool.is_approved === true) return 'approved';
  return 'pending';
}

/**
 * @param {{
 *   status: 'approved'|'pending'|'not_found'|'need_ref',
 *   tool?: object|null,
 *   queried?: { url?: string|null, slug?: string|null },
 * }} result
 * @param {string} [locale]
 */
export function formatAddToolStatusAnswer(result, locale = 'tr') {
  const lang = locale === 'en' ? 'en' : 'tr';
  const name = result.tool?.name || (lang === 'en' ? 'Tool' : 'Araç');
  const link = result.tool?.link || result.queried?.url || '';
  const slug = result.tool?.slug || result.queried?.slug || '';

  if (result.status === 'need_ref') {
    return lang === 'en'
      ? `I can check a catalog candidate’s review status — send the **product URL** or **draft slug** from the earlier queue message.

Examples:
• Check tool status https://example-product.com
• Status of slug \`my-tool\`

Or ask “check my tool status” right after a queue reply in this chat.`
      : `Katalog adayının inceleme durumuna bakabilirim — önceki kuyruk mesajındaki **ürün URL’sini** veya **taslak slug**’ı yaz.

Örnek:
• Durumumu sor https://ornek-urun.com
• \`benim-arac\` slug durumu

Ya da aynı sohbette kuyruk cevabının hemen ardından “durumumu sor” de.`;
  }

  if (result.status === 'not_found') {
    return lang === 'en'
      ? `I couldn’t find a queued candidate for ${link || slug || 'that reference'}.

Tips:
• Use the same official URL you submitted
• Or paste the draft slug from the queue confirmation
• If nothing was queued, say: Add this tool https://…`
      : `${link || slug || 'Bu referans'} için kuyrukta aday bulamadım.

İpucu:
• Gönderdiğin resmî URL’yi kullan
• Kuyruk onayındaki taslak slug’ı yapıştır
• Hiç kuyruğa alınmadıysa: Bu aracı ekle https://…`;
  }

  if (result.status === 'approved') {
    return lang === 'en'
      ? `**${name}** is **approved** and live in the catalog.${link ? `\nLink: ${link}` : ''}${
          slug ? `\nSlug: \`${slug}\`` : ''
        }

Kâşif can recommend it now. Try asking for tools that match this product’s job.`
      : `**${name}** **onaylandı** ve katalogda yayında.${link ? `\nBağlantı: ${link}` : ''}${
          slug ? `\nSlug: \`${slug}\`` : ''
        }

Kâşif artık önerebilir. Bu ürünün işine uyan bir soru sorarak deneyebilirsin.`;
  }

  // pending
  return lang === 'en'
    ? `**${name}** is still **pending admin review** (not published).${
        link ? `\nLink: ${link}` : ''
      }${slug ? `\nDraft slug: \`${slug}\`` : ''}

**Review SLA:** typically **1–3 business days** (best effort).

I’ll keep it off recommendations until an admin approves it.`
    : `**${name}** hâlâ **admin incelemesinde** (yayında değil).${link ? `\nBağlantı: ${link}` : ''}${
        slug ? `\nTaslak slug: \`${slug}\`` : ''
      }

**İnceleme SLA:** genelde **1–3 iş günü** (hedef; garanti değil).

Onaylanana kadar Kâşif önerilerine girmez.`;
}

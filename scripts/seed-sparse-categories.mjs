#!/usr/bin/env node
/**
 * Boş / seyrek primary kategorilere bilinen gerçek AI araçları ekler.
 *   node scripts/seed-sparse-categories.mjs --dry-run
 *   node scripts/seed-sparse-categories.mjs --apply
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const SEEDS = [
  {
    name: 'Meshy',
    slug: 'meshy',
    link: 'https://www.meshy.ai',
    category: '3d-modelleme',
    pricing_model: 'Freemium',
    description:
      'Metin veya görselden yüksek kaliteli 3D modeller üreten yapay zeka aracı; oyun ve ürün görselleştirme için ideal.',
  },
  {
    name: 'Luma AI Dream Machine',
    slug: 'luma-ai-dream-machine',
    link: 'https://lumalabs.ai/dream-machine',
    category: 'video-uretim',
    pricing_model: 'Freemium',
    description:
      'Metinden gerçekçi video klipler üreten Luma AI modeli; kısa sinematik sahneler ve motion içerikler için kullanılır.',
  },
  {
    name: 'Inworld AI',
    slug: 'inworld-ai',
    link: 'https://inworld.ai',
    category: 'oyun-eglence',
    pricing_model: 'Freemium',
    description:
      'Oyunlar ve interaktif deneyimler için konuşan, kişilik sahibi NPC karakterler oluşturan yapay zeka platformu.',
  },
  {
    name: 'Scenario',
    slug: 'scenario-gg',
    link: 'https://www.scenario.com',
    category: 'oyun-eglence',
    pricing_model: 'Freemium',
    description:
      'Oyun stüdyoları için tutarlı stil ve asset üretimi sağlayan oyun odaklı generative AI platformu.',
  },
  {
    name: 'HireVue',
    slug: 'hirevue',
    link: 'https://www.hirevue.com',
    category: 'insan-kaynaklari',
    pricing_model: 'Abonelik',
    description:
      'Video mülakat ve işe alım süreçlerini yapay zeka ile hızlandıran kurumsal İK değerlendirme platformu.',
  },
  {
    name: 'Paradox Olivia',
    slug: 'paradox-olivia',
    link: 'https://www.paradox.ai',
    category: 'insan-kaynaklari',
    pricing_model: 'Abonelik',
    description:
      'Aday iletişimi, randevu ve ön eleme süreçlerini otomatikleştiren konuşma tabanlı işe alım asistanı.',
  },
  {
    name: 'Darktrace',
    slug: 'darktrace',
    link: 'https://www.darktrace.com',
    category: 'guvenlik-siber',
    pricing_model: 'Abonelik',
    description:
      'Kurumsal ağlarda anomali tespiti yapan self-learning siber güvenlik yapay zeka platformu.',
  },
  {
    name: 'Snyk',
    slug: 'snyk',
    link: 'https://snyk.io',
    category: 'guvenlik-siber',
    pricing_model: 'Freemium',
    description:
      'Kod, bağımlılık ve konteyner güvenliğini tarayan geliştirici odaklı siber güvenlik platformu.',
  },
  {
    name: 'Ready Player Me',
    slug: 'ready-player-me',
    link: 'https://readyplayer.me',
    category: '3d-modelleme',
    pricing_model: 'Freemium',
    description:
      'Oyun ve metaverse projeleri için çapraz platform 3D avatar oluşturma altyapısı sunar.',
  },
  {
    name: 'Synthesia',
    slug: 'synthesia',
    link: 'https://www.synthesia.io',
    category: 'video-uretim',
    pricing_model: 'Abonelik',
    description:
      'Metinden profesyonel AI avatar videoları üreten platform; eğitim, pazarlama ve iç iletişim için kullanılır.',
  },
  {
    name: 'Ada',
    slug: 'ada-support',
    link: 'https://www.ada.cx',
    category: 'musteri-destek',
    pricing_model: 'Abonelik',
    description:
      'Müşteri destek ekipleri için otomasyon ve çok dilli sohbet botları sunan yapay zeka destek platformu.',
  },
  {
    name: 'Ramp',
    slug: 'ramp',
    link: 'https://ramp.com',
    category: 'is-dunyasi',
    pricing_model: 'Freemium',
    description:
      'Şirket harcamaları, kartlar ve fatura yönetimini AI ile optimize eden finans operasyon platformu.',
  },
  {
    name: 'Khanmigo',
    slug: 'khanmigo',
    link: 'https://www.khanmigo.ai',
    category: 'egitim',
    pricing_model: 'Abonelik',
    description:
      'Khan Academy’nin öğrenciler ve öğretmenler için kişisel AI tutor ve ders planlama asistanı.',
  },
  {
    name: 'Elicit',
    slug: 'elicit',
    link: 'https://elicit.com',
    category: 'arastirma-akademik',
    pricing_model: 'Freemium',
    description:
      'Akademik makaleleri bulup özetleyen ve araştırma sorularına kanıt temelli yanıtlar üreten AI asistanı.',
  },
];

const dryRun = !process.argv.includes('--apply');

function normalizeLink(link) {
  try {
    const u = new URL(link);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return String(link || '').toLowerCase();
  }
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: cats } = await sb.from('categories').select('id,slug');
  const bySlug = new Map((cats || []).map((c) => [c.slug, c]));

  const { data: existing } = await sb.from('tools').select('name,slug,link');
  const names = new Set((existing || []).map((t) => t.name.toLocaleLowerCase('tr-TR')));
  const slugs = new Set((existing || []).map((t) => t.slug));
  const links = new Set((existing || []).map((t) => normalizeLink(t.link)));

  const rows = [];
  for (const seed of SEEDS) {
    if (names.has(seed.name.toLocaleLowerCase('tr-TR'))) continue;
    if (slugs.has(seed.slug)) continue;
    if (links.has(normalizeLink(seed.link))) continue;
    const cat = bySlug.get(seed.category);
    if (!cat) {
      console.warn('missing category', seed.category);
      continue;
    }
    rows.push({
      name: seed.name,
      slug: seed.slug,
      link: seed.link,
      description: seed.description,
      category_id: cat.id,
      pricing_model: seed.pricing_model,
      platforms: ['Web'],
      is_approved: true,
      tier: 'Normal',
      technical_details: `Öne çıkan özellikler:\n- ${seed.category} kategorisinde bilinen AI aracı\n- Resmî ürün sitesi üzerinden erişim`,
      suggester_email: 'catalog-seed@aikesif.com',
    });
  }

  console.log(`${dryRun ? 'DRY-RUN' : 'APPLY'}: will insert ${rows.length} tools`);
  console.log(rows.map((r) => `${r.name} → ${r.slug}`).join('\n'));

  if (!dryRun && rows.length) {
    const { error } = await sb.from('tools').insert(rows);
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log('inserted', rows.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

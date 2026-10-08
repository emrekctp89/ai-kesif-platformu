import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import { ArrowRight, BookOpen, GraduationCap, MessageSquare, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import LearningStudio from '@/components/learn/LearningStudio';
import LearningResources from '@/components/learn/LearningResources';
import { LEARNING_JOURNEYS } from '@/lib/learn/journeys';
import { generatePageMetadata } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';

export const dynamic = 'force-dynamic';
const CURATED_TRACKS = LEARNING_JOURNEYS.map((route) => ({ slug: route.id }));

async function getGuides() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('title, slug, description, featured_image_url, published_at')
      .eq('status', 'Yayınlandı')
      .eq('type', 'Rehber')
      .order('published_at', { ascending: false });

    if (error) {
      logger.error('Rehberler çekilirken hata:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    logger.error('Rehberler beklenmeyen hata:', error);
    return [];
  }
}

async function getLearningPaths() {
  try {
    const supabase = await createClient();

    let { data, error } = await supabase
      .from('collections')
      .select('title, slug, description, profiles(username), collection_tools(count)')
      .eq('is_public', true)
      .eq('type', 'Öğrenme Yolu')
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await supabase
        .from('collections')
        .select('title, slug, description, profiles(username)')
        .eq('is_public', true)
        .eq('type', 'Öğrenme Yolu')
        .order('created_at', { ascending: false });

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      logger.error('Öğrenme yolları çekilirken hata:', error);
      return [];
    }

    return (data || []).map((path) => {
      const countRow = Array.isArray(path.collection_tools) ? path.collection_tools[0] : null;
      const toolsCount = Number(countRow?.count) || 0;
      const profile = Array.isArray(path.profiles) ? path.profiles[0] : path.profiles;
      return {
        title: path.title,
        slug: path.slug,
        description: path.description,
        authorUsername: profile?.username || null,
        toolsCount,
      };
    });
  } catch (error) {
    logger.error('Öğrenme yolları beklenmeyen hata:', error);
    return [];
  }
}

async function getCuratedTracksWithTools() {
  try {
    const supabase = await createClient();
    const slugs = CURATED_TRACKS.map((track) => track.slug);

    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', slugs);

    if (error || !categories?.length) {
      if (error) logger.error('Kategori öğrenme rotaları hatası:', error);
      return CURATED_TRACKS.map((track) => ({
        ...track,
        categoryName: null,
        tools: [],
      }));
    }

    const bySlug = new Map(categories.map((category) => [category.slug, category]));

    const tracks = await Promise.all(
      CURATED_TRACKS.map(async (track) => {
        const category = bySlug.get(track.slug);
        if (!category) {
          return { ...track, categoryName: null, tools: [] };
        }

        const { data: tools } = await supabase
          .from('tools')
          .select('name, slug, description, pricing_model')
          .eq('category_id', category.id)
          .eq('is_approved', true)
          .order('updated_at', { ascending: false })
          .limit(4);

        return {
          ...track,
          categoryName: category.name,
          tools: tools || [],
        };
      })
    );

    return tracks;
  } catch (error) {
    logger.error('Kategori rotaları beklenmeyen hata:', error);
    return CURATED_TRACKS.map((track) => ({ ...track, categoryName: null, tools: [] }));
  }
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Learn' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/ogren' : '/ogren',
  });
}

export default async function LearningHubPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Learn' });
  const s = await getTranslations({ locale, namespace: 'LearnStudio' });
  const [guides, paths, tracks] = await Promise.all([
    getGuides(),
    getLearningPaths(),
    getCuratedTracksWithTools(),
  ]);
  const toolsByCategory = Object.fromEntries(
    tracks.map((track) => [track.slug, track.tools.map(({ name, slug }) => ({ name, slug }))])
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('subtitle'),
    url: getSiteOrigin() + (locale === 'en' ? '/en/ogren' : '/ogren'),
    inLanguage: locale === 'en' ? 'en-US' : 'tr-TR',
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <div className="mx-auto max-w-6xl space-y-12 pb-12 sm:space-y-16">
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center">
            <div>
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
                {t('heroChip')}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                {t('subtitle')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#learning-studio"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
                >
                  {s('chooseRoute')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#learning-resources"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border bg-background px-5 font-semibold"
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {s('resourcesTitle')}
                </a>
              </div>
            </div>
            <div className="rounded-2xl border bg-background/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {s('todayTitle')}
              </p>
              <h2 className="mt-3 text-xl font-bold">{s('todayHeading')}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s('todayBody')}</p>
              <ol className="mt-4 space-y-2 text-sm">
                {['todayStep1', 'todayStep2', 'todayStep3'].map((key, i) => (
                  <li key={key} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>{s(key)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                {s('freeLessons')} · {s('noAccount')}
              </p>
            </div>
          </div>
        </section>
        <nav aria-label={s('hubNavigation')} className="flex flex-wrap gap-2">
          {[
            ['#learning-studio', 'routesNav'],
            ['#learning-resources', 'resourcesNav'],
            ['#platform-learning', 'platformNav'],
            ['#learning-faq', 'faqNav'],
          ].map(([href, key]) => (
            <a
              key={href}
              href={href}
              className="min-h-11 rounded-full border px-4 py-3 text-sm font-semibold hover:bg-muted"
            >
              {s(key)}
            </a>
          ))}
        </nav>
        <LearningStudio toolsByCategory={toolsByCategory} />
        <section
          id="platform-learning"
          aria-labelledby="platform-learning-heading"
          className="scroll-mt-24 rounded-3xl border bg-gradient-to-br from-violet-500/10 to-background p-6 sm:p-8"
        >
          <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {s('platformEyebrow')}
              </p>
              <h2 id="platform-learning-heading" className="mt-3 text-2xl font-bold">
                {s('platformTitle')}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{s('platformBody')}</p>
              <Link
                href="/ogren/kasif"
                prefetch={false}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold"
              >
                {s('platformCta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="rounded-2xl border bg-background/70 p-5">
              <p className="font-semibold">{s('accessTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s('accessBody')}</p>
              <Link
                href="/kasif"
                prefetch={false}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {s('chatCta')}
              </Link>
              <Link
                href="/uyelik"
                prefetch={false}
                className="mt-1 block min-h-11 py-3 text-sm font-semibold text-primary"
              >
                {s('proCta')}
              </Link>
            </div>
          </div>
        </section>
        <LearningResources guides={guides} paths={paths} />
        <section id="learning-faq" aria-labelledby="learning-faq-heading" className="scroll-mt-24">
          <h2 id="learning-faq-heading" className="mb-5 text-2xl font-bold">
            {s('faqTitle')}
          </h2>
          <div className="divide-y rounded-2xl border bg-card">
            {[1, 2, 3, 4].map((i) => (
              <details key={i} className="group p-5">
                <summary className="cursor-pointer text-sm font-semibold leading-6">
                  {s('faqQ' + i)}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {s('faqA' + i)}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Compass, LayoutGrid, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CategoryGrid } from '@/components/CategoryGrid';
import { sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 3600;

async function getCategories() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.from('categories').select('name, slug').order('name');

  if (error) {
    console.error('Kategoriler çekilirken hata:', error);
    return [];
  }
  return sortCategoriesByCanonicalOrder(data || []);
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CategoriesPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/kategori' : '/kategori',
  });
}

export default async function CategoriesIndexPage({ params }) {
  await params;
  const t = await getTranslations('CategoriesPage');
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-8 sm:space-y-12 sm:pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold">
              {t('statsCategories', { count: categories.length })}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="glass-button min-h-9 rounded-full"
            >
              <Link href="/kesfet" prefetch={false}>
                <Compass className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('ctaDiscover')}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="ai-tavsiye-gradient min-h-9 rounded-full border-0 font-semibold"
            >
              <Link href="/tavsiye" prefetch={false}>
                <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('ctaRecommend')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <CategoryGrid categories={categories} limit={null} showAllLink={false} />
      ) : (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
          <Button asChild className="brand-gradient mt-6 min-h-11">
            <Link href="/" prefetch={false}>
              {t('ctaHome')}
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

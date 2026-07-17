import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { Images, PlusCircle, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ShowcaseGallery } from '@/components/ShowcaseGallery';
import { ShowcaseFilters } from '@/components/ShowcaseFilters';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

async function getPublicShowcaseItems(searchParams) {
  const supabase = await createClient(await cookies());
  const contentType = searchParams.contentType || null;
  const toolId = searchParams.toolId || null;
  const sortBy = searchParams.sortBy || 'newest';

  const { data, error } = await supabase.rpc('get_public_showcase_items', {
    p_content_type: contentType,
    p_tool_id: toolId,
    p_sort_by: sortBy,
  });

  if (error) {
    console.error('Herkese açık eserler çekilirken hata:', error);
    return [];
  }
  return data || [];
}

const getSupabase = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

const getAllToolsForSelect = unstable_cache(
  async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tools')
      .select('id, name')
      .eq('is_approved', true)
      .order('name');
    if (error) {
      console.error('Filtre için araçlar çekilirken hata:', error);
      return [];
    }
    return data || [];
  },
  ['all-tools-for-showcase-filter'],
  { revalidate: 3600 }
);

async function getCurrentUser() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ShowcasePage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/eserler' : '/eserler',
  });
}

export default async function ShowcasePage(props) {
  const searchParams = await props.searchParams;
  await props.params;
  const t = await getTranslations('ShowcasePage');

  const [items, allTools, user] = await Promise.all([
    getPublicShowcaseItems(searchParams),
    getAllToolsForSelect(),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10 sm:space-y-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Images className="h-4 w-4" aria-hidden="true" />
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
              {t('statsItems', { count: items.length })}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="glass-button min-h-9 rounded-full"
            >
              <Link href="/topluluk" prefetch={false}>
                <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('ctaCommunity')}
              </Link>
            </Button>
            {user ? (
              <Button asChild size="sm" className="brand-gradient min-h-9 rounded-full border-0">
                <Link href="/eserler/edit" prefetch={false}>
                  <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {t('ctaSubmit')}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5">
        <ShowcaseFilters allTools={allTools} />
      </div>

      {items.length > 0 ? (
        <ShowcaseGallery items={items} user={user} />
      ) : (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <Images className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/eserler" prefetch={false}>
              {t('title')}
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { BookOpen, Building, FlaskConical, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

async function getResearchPapers() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.rpc('get_all_published_papers');

  if (error) {
    logger.error('Araştırma makaleleri çekilirken hata:', error);
    return [];
  }
  return data || [];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ResearchPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/arastirma' : '/arastirma',
  });
}

export default async function ResearchPortalPage({ params }) {
  await params;
  const t = await getTranslations('ResearchPage');
  const papers = await getResearchPapers();

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-5 flex justify-center">
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsPapers', { count: papers.length })}
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {papers.length > 0 ? (
          papers.map((paper) => {
            const authors = Array.isArray(paper.authors) ? paper.authors : [];
            const authorNames = authors
              .map((a) => a.name)
              .filter(Boolean)
              .join(', ');
            const institutions = [
              ...new Set(authors.map((a) => a.institution).filter(Boolean)),
            ].join(', ');

            return (
              <Card
                key={paper.paper_id}
                className="glass-panel border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
              >
                <CardHeader>
                  <a
                    href={paper.paper_doi_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CardTitle className="text-xl group-hover:text-primary">
                      {paper.paper_title}
                    </CardTitle>
                  </a>
                  <CardDescription className="line-clamp-3 pt-2">
                    {paper.paper_summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {authorNames ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="sr-only">{t('authors')}: </span>
                        {authorNames}
                      </span>
                    </div>
                  ) : null}
                  {institutions ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Building className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="sr-only">{t('institutions')}: </span>
                        {institutions}
                      </span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
          </section>
        )}
      </div>
    </div>
  );
}

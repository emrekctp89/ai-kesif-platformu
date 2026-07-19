import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Link } from '@/i18n/routing';
import { ArrowRight, Calendar, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { NewsletterSignup } from '@/components/NewsletterSignup';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 3600;

async function getPublishedNewsletters() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('newsletters')
    .select('title, slug, description, subject, sent_at')
    .order('sent_at', { ascending: false });

  if (error) {
    logger.error('Bülten arşivi çekilirken hata:', error);
    return [];
  }

  return data || [];
}

function formatDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'NewsletterPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/bulten' : '/bulten',
  });
}

export default async function BultenPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'NewsletterPage' });
  const newsletters = await getPublishedNewsletters();

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-10 sm:space-y-14">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <section>
        <NewsletterSignup />
      </section>

      <section aria-labelledby="bulten-arsiv-heading">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="bulten-arsiv-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {t('archiveHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t('archiveSubheading')}
            </p>
          </div>
          {newsletters.length > 0 ? (
            <Badge variant="secondary" className="w-fit font-semibold">
              {t('archiveCount', { count: newsletters.length })}
            </Badge>
          ) : null}
        </div>

        {newsletters.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 sm:gap-6">
            {newsletters.map((item) => {
              const dateLabel = formatDate(item.sent_at, locale);
              return (
                <Link
                  key={item.slug}
                  href={`/bulten/${item.slug}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  prefetch={false}
                >
                  <Card className="glass-panel h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="space-y-3">
                      {dateLabel ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <time dateTime={item.sent_at}>{dateLabel}</time>
                        </div>
                      ) : null}
                      <CardTitle className="text-xl leading-snug transition-colors group-hover:text-primary">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {item.description || item.subject || t('fallbackDesc')}
                      </p>
                      <span className="inline-flex items-center text-sm font-semibold text-primary">
                        {t('readIssue')}
                        <ArrowRight
                          className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="glass-panel border-dashed border-border/60">
            <CardContent className="py-12 text-center">
              <Mail
                className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60"
                aria-hidden="true"
              />
              <p className="mx-auto max-w-md text-sm text-muted-foreground">{t('emptyArchive')}</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

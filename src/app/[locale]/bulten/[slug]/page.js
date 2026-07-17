import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generatePageMetadata, generateStructuredData } from '@/utils/seo';

export const revalidate = 3600;

async function getNewsletter(slug) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('newsletters')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function formatDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { slug, locale } = params;
  const newsletter = await getNewsletter(slug);
  if (!newsletter) return { title: 'Not found' };

  return generatePageMetadata({
    title: newsletter.title,
    description:
      newsletter.description || newsletter.subject || 'AI Keşif Platformu haftalık bülten arşivi.',
    path: locale === 'en' ? `/en/bulten/${newsletter.slug}` : `/bulten/${newsletter.slug}`,
    type: 'article',
    publishedTime: newsletter.sent_at,
    modifiedTime: newsletter.updated_at || newsletter.sent_at,
  });
}

function Section({ title, children }) {
  return (
    <section className="border-b border-border/60 pb-8 last:border-b-0 last:pb-0">
      <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ContentCard({ children }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
      {children}
    </div>
  );
}

function NewsletterArticleBody({ content, t }) {
  if (!content || typeof content !== 'object') return null;

  const hasAny =
    content.trending_tools?.length > 0 ||
    content.top_prompt ||
    content.top_showcase ||
    content.latest_post;

  if (!hasAny) return null;

  return (
    <div className="space-y-10">
      {content.trending_tools?.length > 0 ? (
        <Section title={`🔥 ${t('trending')}`}>
          {content.trending_tools.map((tool, index) => (
            <ContentCard key={tool.slug || tool.name || index}>
              <Link
                href={`/tool/${tool.slug}`}
                className="font-semibold text-foreground hover:text-primary"
              >
                {index + 1}. {tool.name}
              </Link>
              {tool.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              ) : null}
            </ContentCard>
          ))}
        </Section>
      ) : null}

      {content.top_prompt ? (
        <Section title={`⭐ ${t('topPrompt')}`}>
          <ContentCard>
            {content.top_prompt.title ? (
              <p className="mb-2 font-semibold text-foreground">{content.top_prompt.title}</p>
            ) : null}
            {content.top_prompt.prompt_text ? (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground">
                {content.top_prompt.prompt_text}
              </pre>
            ) : null}
            {content.top_prompt.tool_slug ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('forTool', {
                  name: content.top_prompt.tool_name || content.top_prompt.tool_slug,
                })}{' '}
                <Link
                  href={`/tool/${content.top_prompt.tool_slug}`}
                  className="text-primary hover:underline"
                >
                  →
                </Link>
              </p>
            ) : null}
          </ContentCard>
        </Section>
      ) : null}

      {content.top_showcase ? (
        <Section title={`🎨 ${t('topShowcase')}`}>
          <ContentCard>
            <Link href={`/eserler?eserId=${content.top_showcase.id}`} className="block text-center">
              {content.top_showcase.image_url ? (
                <div className="mx-auto mb-3 max-w-lg overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- showcase CDN host varies */}
                  <img
                    src={content.top_showcase.image_url}
                    alt={content.top_showcase.title || t('topShowcase')}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ) : null}
              <p className="font-semibold text-foreground hover:text-primary">
                {content.top_showcase.title}
              </p>
              {content.top_showcase.author_username ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('createdBy', { name: content.top_showcase.author_username })}
                </p>
              ) : null}
            </Link>
          </ContentCard>
        </Section>
      ) : null}

      {content.latest_post ? (
        <Section title={`✍️ ${t('latestPost')}`}>
          <ContentCard>
            <Link
              href={`/blog/${content.latest_post.slug}`}
              className="font-semibold text-foreground hover:text-primary"
            >
              {content.latest_post.title}
            </Link>
            {content.latest_post.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {content.latest_post.description}
              </p>
            ) : null}
          </ContentCard>
        </Section>
      ) : null}
    </div>
  );
}

export default async function BultenDetailPage(props) {
  const params = await props.params;
  const { slug, locale } = params;
  const t = await getTranslations({ locale, namespace: 'NewsletterDetail' });
  const newsletter = await getNewsletter(slug);
  if (!newsletter) notFound();

  const content = newsletter.content_json || {};
  const hasStructuredContent =
    content.trending_tools?.length > 0 ||
    content.top_prompt ||
    content.top_showcase ||
    content.latest_post;
  const dateLabel = formatDate(newsletter.sent_at, locale);

  const structuredData = generateStructuredData('Article', {
    title: newsletter.title,
    description: newsletter.description || newsletter.subject,
    image: null,
    author: 'AI Keşif Platformu',
    publishedDate: newsletter.sent_at,
    modifiedDate: newsletter.updated_at || newsletter.sent_at,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />

      <article className="mx-auto max-w-3xl space-y-8 pb-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/bulten">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('backArchive')}
          </Link>
        </Button>

        <header className="space-y-4 border-b border-border/60 pb-8">
          <Badge variant="secondary" className="font-semibold">
            <Mail className="mr-1 h-3 w-3" aria-hidden="true" />
            {t('badge')}
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {newsletter.title}
          </h1>
          {newsletter.description ? (
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              {newsletter.description}
            </p>
          ) : null}
          {dateLabel ? (
            <time dateTime={newsletter.sent_at} className="block text-sm text-muted-foreground">
              {t('sentOn', { date: dateLabel })}
            </time>
          ) : null}
        </header>

        <div>
          {hasStructuredContent ? (
            <>
              <p className="mb-10 text-base leading-relaxed text-muted-foreground">{t('intro')}</p>
              <NewsletterArticleBody content={content} t={t} />
            </>
          ) : newsletter.html_content ? (
            <div
              className="newsletter-html overflow-hidden rounded-2xl border border-border/50 bg-card p-4 glass-panel sm:p-6 [&_a]:text-primary [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_img]:max-w-full [&_img]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: newsletter.html_content }}
            />
          ) : (
            <p className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center text-muted-foreground">
              {t('noContent')}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-8">
          <Link
            href="/bulten"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('allIssues')}
          </Link>
          <Link
            href="/bulten"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t('subscribe')}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </footer>
      </article>
    </>
  );
}

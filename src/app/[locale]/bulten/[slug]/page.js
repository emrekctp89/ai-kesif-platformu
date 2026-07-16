import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { generatePageMetadata, generateStructuredData } from '@/utils/seo';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

async function getNewsletter(slug) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('newsletters').select('*').eq('slug', slug).single();

  if (error || !data) {
    notFound();
  }

  return data;
}

export async function generateMetadata(props) {
  const params = await props.params;
  const newsletter = await getNewsletter(params.slug);

  return generatePageMetadata({
    title: newsletter.title,
    description:
      newsletter.description || newsletter.subject || 'AI Keşif Platformu haftalık bülten arşivi.',
    path: `/bulten/${newsletter.slug}`,
    type: 'article',
    publishedTime: newsletter.sent_at,
    modifiedTime: newsletter.updated_at || newsletter.sent_at,
  });
}

function Section({ title, children }) {
  return (
    <section className="border-b border-border/80 pb-8 last:border-b-0 last:pb-0">
      <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ContentCard({ children }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
      {children}
    </div>
  );
}

function NewsletterArticleBody({ content }) {
  if (!content || typeof content !== 'object') {
    return null;
  }

  const hasAny =
    content.trending_tools?.length > 0 ||
    content.top_prompt ||
    content.top_showcase ||
    content.latest_post;

  if (!hasAny) {
    return null;
  }

  return (
    <div className="space-y-10">
      {content.trending_tools?.length > 0 && (
        <Section title="🔥 Haftanın Trendleri">
          {content.trending_tools.map((tool, index) => (
            <ContentCard key={tool.slug || tool.name || index}>
              <Link
                href={`/tool/${tool.slug}`}
                className="font-semibold text-foreground hover:text-primary"
              >
                {index + 1}. {tool.name}
              </Link>
              {tool.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              )}
            </ContentCard>
          ))}
        </Section>
      )}

      {content.top_prompt && (
        <Section title="⭐ Haftanın Prompt'u">
          <ContentCard>
            {content.top_prompt.title && (
              <p className="mb-2 font-semibold text-foreground">{content.top_prompt.title}</p>
            )}
            {content.top_prompt.prompt_text && (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground">
                {content.top_prompt.prompt_text}
              </pre>
            )}
            {content.top_prompt.tool_slug && (
              <p className="mt-3 text-xs text-muted-foreground">
                <Link
                  href={`/tool/${content.top_prompt.tool_slug}`}
                  className="text-primary hover:underline"
                >
                  {content.top_prompt.tool_name || content.top_prompt.tool_slug}
                </Link>{' '}
                için.
              </p>
            )}
          </ContentCard>
        </Section>
      )}

      {content.top_showcase && (
        <Section title="🎨 Haftanın Eseri">
          <ContentCard>
            <Link href={`/eserler?eserId=${content.top_showcase.id}`} className="block text-center">
              {content.top_showcase.image_url && (
                <div className="mx-auto mb-3 max-w-lg overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- showcase CDN host varies */}
                  <img
                    src={content.top_showcase.image_url}
                    alt={content.top_showcase.title || 'Haftanın eseri'}
                    className="h-auto w-full object-cover"
                  />
                </div>
              )}
              <p className="font-semibold text-foreground hover:text-primary">
                {content.top_showcase.title}
              </p>
              {content.top_showcase.author_username && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Oluşturan: {content.top_showcase.author_username}
                </p>
              )}
            </Link>
          </ContentCard>
        </Section>
      )}

      {content.latest_post && (
        <Section title="✍️ Son Yazımız">
          <ContentCard>
            <Link
              href={`/blog/${content.latest_post.slug}`}
              className="font-semibold text-foreground hover:text-primary"
            >
              {content.latest_post.title}
            </Link>
            {content.latest_post.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {content.latest_post.description}
              </p>
            )}
          </ContentCard>
        </Section>
      )}
    </div>
  );
}

export default async function BultenDetailPage(props) {
  const params = await props.params;
  const newsletter = await getNewsletter(params.slug);
  const content = newsletter.content_json || {};
  const hasStructuredContent =
    content.trending_tools?.length > 0 ||
    content.top_prompt ||
    content.top_showcase ||
    content.latest_post;

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

      <article className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/bulten"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Bülten arşivine dön
        </Link>

        <header className="mb-10 border-b border-border pb-8">
          <Badge variant="secondary" className="mb-4">
            Haftalık Bülten
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {newsletter.title}
          </h1>
          {newsletter.description && (
            <p className="mt-4 text-lg text-muted-foreground">{newsletter.description}</p>
          )}
          <time dateTime={newsletter.sent_at} className="mt-4 block text-sm text-muted-foreground">
            Gönderim:{' '}
            {new Date(newsletter.sent_at).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>

        <div className="prose-article">
          {hasStructuredContent ? (
            <>
              <p className="mb-10 text-base leading-relaxed text-muted-foreground">
                Merhaba! AI Keşif Platformu&apos;nda bu hafta öne çıkanlar ve topluluğun en
                sevdikleri burada. İşte kaçırmamanız gerekenler:
              </p>
              <NewsletterArticleBody content={content} />
            </>
          ) : newsletter.html_content ? (
            <div
              className="newsletter-html overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6 [&_a]:text-primary [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_img]:max-w-full [&_img]:rounded-lg"
              // Trusted archive HTML produced by our own email template renderer.
              dangerouslySetInnerHTML={{ __html: newsletter.html_content }}
            />
          ) : (
            <p className="text-muted-foreground">Bu bülten için içerik bulunamadı.</p>
          )}
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <Link
            href="/bulten"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Tüm bültenler
          </Link>
          <Link
            href="/bulten"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Abone ol
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </footer>
      </article>
    </>
  );
}

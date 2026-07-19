import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  FlaskConical,
  GraduationCap,
  User,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateBlogMetadata, generateStructuredData } from '@/utils/seo';
import { attachAuthorsToPosts, authorDisplayName } from '@/lib/contentAuthors';

export const revalidate = 3600;

async function getPost(slug) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'Yayınlandı')
    .maybeSingle();

  if (error || !data) return null;
  const [withAuthor] = await attachAuthorsToPosts(supabase, [data]);
  return withAuthor || data;
}

async function getRelatedPosts(post) {
  if (!post?.id) return [];
  const supabase = await createClient(await cookies());

  // Prefer same type; fall back to latest published posts.
  const primary = await supabase
    .from('posts')
    .select('id, title, slug, description, type, published_at, author_id, featured_image_url')
    .eq('status', 'Yayınlandı')
    .eq('type', post.type || 'Yazı')
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3);

  let rows = primary.data || [];
  if (!rows.length) {
    const fallback = await supabase
      .from('posts')
      .select('id, title, slug, description, type, published_at, author_id, featured_image_url')
      .eq('status', 'Yayınlandı')
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3);
    rows = fallback.data || [];
  }

  return attachAuthorsToPosts(supabase, rows);
}

function formatDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function estimateReadMinutes(content) {
  const text = String(content || '').replace(/[#>*`_[\]()!-]/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { slug } = params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Not found' };
  }

  return generateBlogMetadata({
    title: post.title,
    description: post.description,
    slug: post.slug,
    image: post.featured_image_url,
    publishedDate: post.published_at,
    modifiedDate: post.updated_at || post.published_at,
    author: authorDisplayName(post, 'AI Keşif Platformu'),
  });
}

export default async function PostPage(props0) {
  const params = await props0.params;
  const { slug, locale } = params;
  const t = await getTranslations({ locale, namespace: 'BlogPost' });
  const post = await getPost(slug);

  if (!post) notFound();

  const dateLabel = formatDate(post.published_at, locale);
  const isGuide = post.type === 'Rehber';
  const minutes = estimateReadMinutes(post.content);
  const authorName = authorDisplayName(post, t('defaultAuthor'));
  const authorHref = post.author?.username ? `/u/${post.author.username}` : null;
  const related = await getRelatedPosts(post);

  const structuredData = generateStructuredData('Article', {
    title: post.title,
    description: post.description,
    image: post.featured_image_url,
    author: authorName,
    publishedDate: post.published_at,
    modifiedDate: post.updated_at || post.published_at,
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
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
            <Link href="/blog" prefetch={false}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('backToBlog')}
            </Link>
          </Button>

          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isGuide ? 'default' : 'secondary'} className="font-semibold">
                {isGuide ? (
                  <>
                    <BookOpen className="mr-1 h-3 w-3" aria-hidden="true" />
                    {t('guideBadge')}
                  </>
                ) : (
                  t('postBadge')
                )}
              </Badge>
              <span className="text-xs text-muted-foreground">{t('readTime', { minutes })}</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {post.title}
            </h1>

            {post.description ? (
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {post.description}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {dateLabel ? (
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.published_at}>{t('publishedOn', { date: dateLabel })}</time>
                </p>
              ) : null}
              <p className="flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                {authorHref ? (
                  <Link
                    href={authorHref}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                    prefetch={false}
                  >
                    {authorName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{authorName}</span>
                )}
              </p>
            </div>
          </header>
        </div>

        {post.featured_image_url ? (
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 shadow-sm">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        ) : null}

        <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-primary prose-img:rounded-xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a className="font-medium underline-offset-4 hover:underline" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="mt-8 mb-3 text-xl font-bold tracking-tight" {...props} />
              ),
            }}
          >
            {post.content || ''}
          </ReactMarkdown>
        </div>

        {related.length > 0 ? (
          <section
            aria-labelledby="related-posts-heading"
            className="space-y-4 border-t border-border/60 pt-8"
          >
            <h2 id="related-posts-heading" className="text-xl font-bold tracking-tight">
              {t('relatedHeading')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  prefetch={false}
                  className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="glass-panel h-full border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="space-y-2 pb-2">
                      <Badge variant="outline" className="w-fit">
                        {item.type === 'Rehber' ? t('guideBadge') : t('postBadge')}
                      </Badge>
                      <CardTitle className="text-base leading-snug group-hover:text-primary">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.description || ''}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        {t('readMore')}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="space-y-5 border-t border-border/60 pt-8">
          <p className="text-xs text-muted-foreground">{t('shareHint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/blog" prefetch={false}>
                {t('relatedCta')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ogren" prefetch={false}>
                <GraduationCap className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('ctaLearn')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/arastirma" prefetch={false}>
                <FlaskConical className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('ctaResearch')}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/icerik" prefetch={false}>
                {t('ctaCreate')}
              </Link>
            </Button>
          </div>
        </footer>
      </article>
    </>
  );
}

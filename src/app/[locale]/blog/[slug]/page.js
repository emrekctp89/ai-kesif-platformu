import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Calendar, FlaskConical, GraduationCap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generateBlogMetadata, generateStructuredData } from '@/utils/seo';

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

function estimateReadMinutes(content) {
  const text = String(content || '').replace(/[#>*`_[\]()!-]/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { slug, locale } = params;
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
    author: post.author_name || 'AI Keşif Platformu',
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

  const structuredData = generateStructuredData('Article', {
    title: post.title,
    description: post.description,
    image: post.featured_image_url,
    author: post.author_name || 'AI Keşif Platformu',
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

            {dateLabel ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <time dateTime={post.published_at}>{t('publishedOn', { date: dateLabel })}</time>
              </p>
            ) : null}
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
          </div>
        </footer>
      </article>
    </>
  );
}

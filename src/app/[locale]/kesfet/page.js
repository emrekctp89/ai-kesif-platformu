import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Compass,
  GitCompareArrows,
  GraduationCap,
  Library,
  Map,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CommunityFeedPreview } from '@/components/CommunityFeedPreview';
import ToolIcon from '@/components/ToolIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 3600;

async function getDiscoverData() {
  const supabase = await createClient(await cookies());
  const [
    { data: mainData, error: mainError },
    { data: collections, error: collectionsError },
    { data: learningPaths, error: learningPathsError },
  ] = await Promise.all([
    supabase.rpc('get_discover_page_data'),
    supabase.rpc('get_popular_collections'),
    supabase.rpc('get_learning_paths'),
  ]);

  // Partial failure: still render whatever we have.
  if (mainError) {
    logger.error('Keşfet ana verisi hatası:', mainError);
  }
  if (collectionsError) {
    logger.error('Keşfet koleksiyon hatası:', collectionsError);
  }
  if (learningPathsError) {
    logger.error('Keşfet öğrenme yolu hatası:', learningPathsError);
  }

  if (mainError && !mainData) {
    return null;
  }

  return {
    ...(mainData || {}),
    collections: collectionsError ? [] : collections || [],
    learningPaths: learningPathsError ? [] : learningPaths || [],
  };
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Discover' });
  const path = locale === 'en' ? '/en/kesfet' : '/kesfet';

  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path,
  });
}

function SectionHeader({ id, icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2
          id={id}
          className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {Icon ? <Icon className="h-7 w-7 text-primary" aria-hidden="true" /> : null}
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action || null}
    </div>
  );
}

function EmptyNote({ message }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default async function DiscoverPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Discover' });
  const discoverData = await getDiscoverData();

  if (!discoverData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('errorTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('errorBody')}</p>
        <Button asChild className="brand-gradient mt-6 min-h-11">
          <Link href="/">{t('retryHome')}</Link>
        </Button>
      </div>
    );
  }

  const {
    tool_of_the_day,
    latest_tools,
    latest_showcase,
    latest_posts,
    top_users,
    collections,
    learningPaths,
  } = discoverData;

  const quickLinks = [
    { href: '/tavsiye', label: t('quickRecommend'), icon: Sparkles, primary: true },
    { href: '/ogren', label: t('quickLearn'), icon: GraduationCap },
    { href: '/karsilastir', label: t('quickCompare'), icon: GitCompareArrows },
    { href: '/kategori', label: t('quickCategories'), icon: Compass },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-8 sm:space-y-16 sm:pb-12">
      {/* Hero */}
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {quickLinks.map(({ href, label, icon: Icon, primary }) => (
              <Button
                key={href}
                asChild
                size="sm"
                variant={primary ? 'default' : 'outline'}
                className={
                  primary
                    ? 'ai-tavsiye-gradient min-h-10 rounded-full border-0 px-4 font-semibold shadow-md'
                    : 'glass-button min-h-10 rounded-full px-4 font-semibold'
                }
              >
                <Link href={href} prefetch={false}>
                  <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Tool of the day */}
      {tool_of_the_day ? (
        <section aria-labelledby="discover-totd-heading">
          <div className="relative group">
            <div className="brand-glow absolute inset-0 rounded-3xl opacity-40 blur-xl transition-opacity group-hover:opacity-70" />
            <Card className="brand-surface relative overflow-hidden rounded-3xl border-2 border-primary/30 shadow-2xl glass-panel">
              <CardContent className="relative z-10 grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:gap-10">
                <div className="space-y-4">
                  <div className="brand-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold">
                    <Zap className="h-4 w-4" aria-hidden="true" />
                    {t('toolOfDay')}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-2xl border border-border/50 bg-background p-3 shadow-md">
                      <ToolIcon
                        name={tool_of_the_day.name}
                        link={tool_of_the_day.link}
                        className="h-12 w-12"
                      />
                    </div>
                    <div className="min-w-0">
                      <h2
                        id="discover-totd-heading"
                        className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
                      >
                        {tool_of_the_day.name}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {tool_of_the_day.description}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="lg" className="brand-gradient min-h-12 shadow-md">
                    <Link href={`/tool/${tool_of_the_day.slug}`} prefetch={false}>
                      {t('exploreTool')}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {/* Collections */}
      <section aria-labelledby="discover-collections-heading">
        <SectionHeader
          id="discover-collections-heading"
          icon={Library}
          title={t('collectionsHeading')}
          subtitle={t('collectionsSubheading')}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/koleksiyonlar" prefetch={false}>
                {t('viewAllCollections')}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        {collections?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
            {collections.map((collection) => (
              <Link
                key={collection.slug}
                href={`/koleksiyonlar/${collection.slug}`}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                prefetch={false}
              >
                <Card className="glass-panel h-full border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <CardHeader className="space-y-2">
                    <Badge variant="secondary" className="w-fit">
                      <Library className="mr-1 h-3 w-3" aria-hidden="true" />
                      {t('collectionsHeading')}
                    </Badge>
                    <CardTitle className="text-lg leading-snug transition-colors group-hover:text-primary">
                      {collection.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {collection.description || ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {t('createdBy', {
                        name: collection.author_username || t('unknownAuthor'),
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyNote message={t('collectionsEmpty')} />
        )}
      </section>

      {/* Learning paths */}
      <section aria-labelledby="discover-paths-heading">
        <SectionHeader
          id="discover-paths-heading"
          icon={Map}
          title={t('pathsHeading')}
          subtitle={t('pathsSubheading')}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ogren" prefetch={false}>
                {t('viewAllLearn')}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        {learningPaths?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
            {learningPaths.map((path) => (
              <Link
                key={path.slug}
                href={`/koleksiyonlar/${path.slug}`}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                prefetch={false}
              >
                <Card className="glass-panel h-full border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <CardHeader className="space-y-2">
                    <Badge variant="outline" className="w-fit">
                      <Map className="mr-1 h-3 w-3" aria-hidden="true" />
                      {t('pathsHeading')}
                    </Badge>
                    <CardTitle className="text-lg leading-snug transition-colors group-hover:text-primary">
                      {path.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {path.description || ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {t('createdBy', {
                        name: path.author_username || t('unknownAuthor'),
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyNote message={t('pathsEmpty')} />
        )}
      </section>

      <CommunityFeedPreview limit={5} className="max-w-3xl" />

      {/* Showcase + leaders */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <SectionHeader
            id="discover-showcase-heading"
            icon={Sparkles}
            title={t('showcaseHeading')}
            subtitle={t('showcaseSubheading')}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/eserler" prefetch={false}>
                  {t('viewAllShowcase')}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {latest_showcase?.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4">
              {latest_showcase.map((item) => (
                <Link
                  key={item.id}
                  href={`/eserler?eserId=${item.id}`}
                  className="group block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  prefetch={false}
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title || ''}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Sparkles className="h-8 w-8 opacity-40" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyNote message={t('showcaseEmpty')} />
          )}
        </div>

        <div>
          <SectionHeader
            id="discover-leaders-heading"
            icon={Users}
            title={t('leadersHeading')}
            subtitle={t('leadersSubheading')}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/leaderboard" prefetch={false}>
                  {t('viewLeaderboard')}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {top_users?.length > 0 ? (
            <Card className="glass-panel border-border/50">
              <CardContent className="space-y-1 p-3 sm:p-4">
                {top_users.map((user, index) => {
                  const displayName = user.username || user.email || t('unknownAuthor');
                  const fallback = displayName.substring(0, 2).toUpperCase();
                  const href = user.username ? `/u/${user.username}` : '#';
                  return (
                    <Link
                      key={user.username || user.email || index}
                      href={href}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      prefetch={false}
                    >
                      <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                        <AvatarFallback>{fallback}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('points', { count: user.reputation_points ?? 0 })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <EmptyNote message={t('leadersEmpty')} />
          )}
        </div>
      </section>

      {/* Posts + latest tools */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <SectionHeader
            id="discover-posts-heading"
            icon={BookOpen}
            title={t('postsHeading')}
            subtitle={t('postsSubheading')}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/blog" prefetch={false}>
                  {t('viewAllBlog')}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {latest_posts?.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {latest_posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  prefetch={false}
                >
                  <Card className="glass-panel h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    {post.featured_image_url ? (
                      <div className="relative aspect-video bg-muted">
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 40vw"
                        />
                      </div>
                    ) : null}
                    <CardHeader>
                      <CardTitle className="text-lg leading-snug transition-colors group-hover:text-primary">
                        {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {post.description || ''}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyNote message={t('postsEmpty')} />
          )}
        </div>

        <div>
          <SectionHeader
            id="discover-tools-heading"
            title={t('latestToolsHeading')}
            subtitle={t('latestToolsSubheading')}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/" prefetch={false}>
                  {t('viewAllTools')}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          {latest_tools?.length > 0 ? (
            <Card className="glass-panel border-border/50">
              <CardContent className="space-y-1 p-3 sm:p-4">
                {latest_tools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={`/tool/${tool.slug}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    prefetch={false}
                  >
                    <ToolIcon name={tool.name} link={tool.link} className="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tool.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{tool.category_name}</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyNote message={t('latestToolsEmpty')} />
          )}
        </div>
      </section>
    </div>
  );
}

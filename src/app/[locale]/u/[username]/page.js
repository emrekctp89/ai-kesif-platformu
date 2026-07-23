import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Award,
  BookOpen,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  PenLine,
  Users,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { startConversation } from '@/app/actions';
import { FollowButton } from '@/components/FollowButton';
import { BadgesShowcase } from '@/components/BadgesShowcase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getPublishedPostsByAuthor } from '@/lib/contentAuthors';
import { generatePageMetadata } from '@/utils/seo';

const tierColors = {
  Newcomer: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  Contributor: 'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  Expert: 'bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  Mentor: 'bg-amber-200 text-amber-800 dark:bg-amber-700/50 dark:text-amber-300',
};

async function getProfileData(username, currentUserId) {
  const supabase = await createClient(await cookies());

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, follower_count, following_count')
    .eq('username', username)
    .single();

  if (profileError || !profile) notFound();

  let isFollowing = false;
  if (currentUserId && currentUserId !== profile.id) {
    const { data: followRecord } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', currentUserId)
      .eq('following_id', profile.id)
      .maybeSingle();
    isFollowing = !!followRecord;
  }

  const { data: activityData } = await supabase.rpc('get_public_profile_data', {
    p_username: username,
  });

  return {
    ...profile,
    ...(activityData || {}),
    is_current_user: profile.id === currentUserId,
    is_following: isFollowing,
  };
}

export async function generateMetadata(props) {
  const params = await props.params;
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'ProfilePage' });
  const profile = await getProfileData(params.username);

  return generatePageMetadata({
    title: t('metaTitle', { name: profile.username }),
    description: profile.bio || t('metaDescription', { name: profile.username }),
    path: locale === 'en' ? `/en/u/${profile.username}` : `/u/${profile.username}`,
  });
}

export default async function UserProfilePage(props) {
  const params = await props.params;
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'ProfilePage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const profile = await getProfileData(params.username, currentUser?.id);
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const memberSince = new Date(profile.created_at).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
  });

  const publishedPosts = await getPublishedPostsByAuthor(supabase, profile.id, { limit: 6 });

  const hasActivity =
    (profile.comments?.length || 0) > 0 ||
    (profile.favorites?.length || 0) > 0 ||
    (profile.showcase_items?.length || 0) > 0 ||
    publishedPosts.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-md">
            <AvatarImage src={profile.avatar_url} alt="" />
            <AvatarFallback className="text-3xl">
              {profile.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-inner">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t('heroChip')}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {profile.username}
              </h1>
              {profile.tier ? (
                <Badge className={cn('text-sm', tierColors[profile.tier] || 'bg-secondary')}>
                  {profile.tier}
                </Badge>
              ) : null}
              {profile.is_content_creator ? (
                <Badge variant="secondary" className="gap-1 text-sm">
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('contentCreatorBadge')}
                </Badge>
              ) : null}
            </div>
            {profile.bio ? (
              <p className="mt-2 max-w-2xl text-muted-foreground">{profile.bio}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:justify-start">
              <Link
                href={`/u/${profile.username}/followers`}
                className="hover:text-primary"
                prefetch={false}
              >
                <span className="font-bold text-foreground">{profile.follower_count ?? 0}</span>{' '}
                {t('followers')}
              </Link>
              <Link
                href={`/u/${profile.username}/following`}
                className="hover:text-primary"
                prefetch={false}
              >
                <span className="font-bold text-foreground">{profile.following_count ?? 0}</span>{' '}
                {t('following')}
              </Link>
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="font-bold text-foreground">
                  {t('reputation', { count: profile.reputation_points ?? 0 })}
                </span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span>{t('memberSince', { date: memberSince })}</span>
            </div>
          </div>

          {currentUser && !profile.is_current_user ? (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
              <FollowButton
                targetUserId={profile.id}
                targetUsername={profile.username}
                isInitiallyFollowing={profile.is_following}
              />
              <form
                action={async () => {
                  'use server';
                  await startConversation(profile.id);
                }}
              >
                <Button type="submit" variant="secondary" className="min-h-10">
                  <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('sendMessage')}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">{t('badgesHeading')}</h2>
        <Card className="glass-panel border-border/50">
          <CardContent className="p-6">
            <BadgesShowcase badges={profile.badges} />
          </CardContent>
        </Card>
      </section>

      <div className="space-y-6">
        {publishedPosts.length > 0 ? (
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                {t('postsHeading')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {publishedPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  prefetch={false}
                  className="group rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    {post.featured_image_url ? (
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={post.featured_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.type === 'Rehber' ? t('postTypeGuide') : t('postTypeArticle')}
                        {post.published_at
                          ? ` · ${new Date(post.published_at).toLocaleDateString(dateLocale)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {profile.comments?.length > 0 ? (
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
                {t('commentsHeading')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.comments.map((comment, i) => (
                <div key={i} className="rounded-xl bg-muted/50 p-3 text-sm">
                  <p className="italic">&quot;{comment.content}&quot;</p>
                  <Link
                    href={`/tool/${comment.tool_slug}`}
                    className="mt-1 inline-block text-xs text-muted-foreground hover:text-primary"
                    prefetch={false}
                  >
                    {t('commentOnTool', { name: comment.tool_name })}
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {profile.favorites?.length > 0 ? (
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
                {t('favoritesHeading')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.favorites.map((fav, i) => (
                <Link key={i} href={`/tool/${fav.tool_slug}`} prefetch={false}>
                  <Badge
                    variant="secondary"
                    className="hover:bg-primary hover:text-primary-foreground"
                  >
                    {fav.tool_name}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {profile.showcase_items?.length > 0 ? (
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                {t('showcaseHeading')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {profile.showcase_items.map((item) => (
                <Link key={item.id} href={`/eserler?eserId=${item.id}`} prefetch={false}>
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    width={400}
                    height={400}
                    className="aspect-square w-full rounded-md object-cover transition-transform hover:scale-105"
                  />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {!hasActivity ? (
          <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
              {t('emptyActivity')}
            </p>
            <Button asChild variant="outline" className="glass-button mt-6 min-h-11 rounded-xl">
              <Link href="/topluluk" prefetch={false}>
                {t('ctaCommunity')}
              </Link>
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}

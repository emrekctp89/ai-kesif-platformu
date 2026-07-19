import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowUp, Star, UserRound } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import { DeleteCommentButton } from '@/components/DeleteCommentButton';
import { DeletePromptButton } from '@/components/DeletePromptButton';
import { CollectionManager } from '@/components/CollectionManager';
import { ShowcaseManager } from '@/components/ShowcaseManager';
import { ReputationInfo } from '@/components/ReputationInfo';
import { ProfileEditor } from '@/components/ProfileEditor';
import { ProjectList } from '@/components/ProjectList';
import { CreateProjectButton } from '@/components/CreateProjectButton';
import { DailyQuests } from '@/components/DailyQuests';
import { generatePageMetadata } from '@/utils/seo';

// --- DATA FETCHING FUNCTIONS ---

async function getUserProfile(userId) {
  if (!userId) return null;
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_url, reputation_points, username, bio, daily_streak')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('Profil verisi çekilirken hata:', error);
    return null;
  }
  return data;
}

async function getUserReputationEvents(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('reputation_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    logger.error('Kullanıcı puan geçmişi çekilirken hata:', error);
    return [];
  }
  return data;
}

async function getUserCollections(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('collections')
    .select('id, title, is_public')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('Koleksiyonlar çekilirken hata:', error);
    return [];
  }
  return data;
}

async function getUserShowcaseItems(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.rpc('get_user_showcase_items', {
    p_user_id: userId,
  });
  if (error) {
    logger.error('Kullanıcı eserleri çekilirken hata:', error);
    return [];
  }
  return data;
}

async function getUserPrompts(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('prompts')
    .select(`id, title, vote_count, tools ( name, slug )`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error("Kullanıcı prompt'ları çekilirken hata:", error);
    return [];
  }
  return data;
}

async function getUserComments(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('comments')
    .select(`id, content, created_at, tools ( name, slug )`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('Kullanıcı yorumları çekilirken hata:', error);
    return [];
  }
  return data;
}

async function getUserFavoriteTools(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('favorites')
    .select(`tools (id, name, slug, description, categories (name))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('Favori araçlar çekilirken hata:', error);
    return [];
  }
  return data.map((item) => item.tools);
}

async function getUserRatedTools(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('ratings')
    .select(`rating, tools (id, name, slug, description)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('Puanlanan araçlar çekilirken hata:', error);
    return [];
  }
  return data.map((item) => ({ ...item.tools, user_rating: item.rating }));
}

// YENİ: Kullanıcının projelerini çeken fonksiyon
async function getUserProjects(userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (error) {
    logger.error('Projeler çekilirken hata:', error);
    return [];
  }
  return data;
}

// YENİ: Kullanıcının o günkü görevlerini çeken fonksiyon
async function getUserDailyQuests(userId) {
  const supabase = await createClient(await cookies());
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('user_daily_quests')
    .select(
      `
        *,
        quests (
            description,
            action_type,
            target_count,
            reputation_reward
        )
    `
    )
    .eq('user_id', userId)
    .eq('quest_date', today);

  if (error) {
    logger.error('Günlük görevler çekilirken hata:', error);
    return [];
  }
  return data;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfilePanel' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/profile' : '/profile',
    noindex: true,
  });
}

export default async function ProfilePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfilePanel' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const [
    profile,
    reputationEvents,
    collections,
    showcaseItems,
    userPrompts,
    userComments,
    favoriteTools,
    ratedTools,
    projects,
    dailyQuests,
    featuredTool,
    popularTool,
    sampleProfile,
  ] = await Promise.all([
    getUserProfile(user.id),
    getUserReputationEvents(user.id),
    getUserCollections(user.id),
    getUserShowcaseItems(user.id),
    getUserPrompts(user.id),
    getUserComments(user.id),
    getUserFavoriteTools(user.id),
    getUserRatedTools(user.id),
    getUserProjects(user.id),
    getUserDailyQuests(user.id),
    supabase
      .from('tools')
      .select('slug')
      .eq('is_approved', true)
      .eq('is_featured', true)
      .not('slug', 'is', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('tools')
      .select('slug')
      .eq('is_approved', true)
      .not('slug', 'is', null)
      .order('is_featured', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('username')
      .not('username', 'is', null)
      .neq('id', user.id)
      .order('reputation_points', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const questLinkOpts = {
    featuredToolSlug: featuredTool?.data?.slug || null,
    popularToolSlug: popularTool?.data?.slug || featuredTool?.data?.slug || null,
    sampleUsername: sampleProfile?.data?.username || null,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('welcome', { email: user.email })}</p>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <DailyQuests
            quests={dailyQuests}
            streak={profile?.daily_streak || 0}
            questLinkOpts={questLinkOpts}
          />
          <ProfileEditor user={user} profile={profile} />
        </div>
        <div>
          <ReputationInfo
            reputationPoints={profile?.reputation_points || 0}
            events={reputationEvents}
          />
        </div>
      </div>

      <Card className="glass-panel border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t('projectsTitle')}</CardTitle>
            <CardDescription>{t('projectsDescription')}</CardDescription>
          </div>
          <CreateProjectButton />
        </CardHeader>
        <CardContent>
          <ProjectList projects={projects} />
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('collectionsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectionManager collections={collections} />
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('showcaseTitle', { count: showcaseItems.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ShowcaseManager items={showcaseItems} />
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('promptsTitle', { count: userPrompts.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {userPrompts.length > 0 ? (
            <div className="space-y-4">
              {userPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-4"
                >
                  <div>
                    <p className="text-lg font-semibold">{prompt.title}</p>
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={`/tool/${prompt.tools.slug}`}
                        className="font-medium hover:underline"
                        prefetch={false}
                      >
                        {prompt.tools.name}
                      </Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <ArrowUp className="h-4 w-4 text-primary" aria-hidden="true" />
                      {prompt.vote_count}
                    </div>
                    <DeletePromptButton promptId={prompt.id} toolSlug={prompt.tools.slug} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t('promptsEmpty')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('commentsTitle', { count: userComments.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {userComments.length > 0 ? (
            <div className="space-y-4">
              {userComments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <Link
                          href={`/tool/${comment.tools.slug}`}
                          className="font-semibold hover:underline"
                          prefetch={false}
                        >
                          {comment.tools.name}
                        </Link>
                      </p>
                      <p className="mt-2 italic text-foreground">&quot;{comment.content}&quot;</p>
                    </div>
                    <DeleteCommentButton commentId={comment.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t('commentsEmpty')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('favoritesTitle', { count: favoriteTools.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteTools.length > 0 ? (
            <div className="space-y-4">
              {favoriteTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-4"
                >
                  <div>
                    <Link href={`/tool/${tool.slug}`} className="group" prefetch={false}>
                      <h3 className="text-lg font-semibold group-hover:text-primary">
                        {tool.name}
                      </h3>
                    </Link>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                  {tool.categories?.name ? (
                    <span className="ml-4 w-fit shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {tool.categories.name}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t('favoritesEmpty')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('ratedTitle', { count: ratedTools.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {ratedTools.length > 0 ? (
            <div className="space-y-4">
              {ratedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-4"
                >
                  <div>
                    <Link href={`/tool/${tool.slug}`} className="group" prefetch={false}>
                      <h3 className="text-lg font-semibold group-hover:text-primary">
                        {tool.name}
                      </h3>
                    </Link>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-1 text-lg">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    <span className="font-bold">{tool.user_rating}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t('ratedEmpty')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/50 glass-panel">
        <CardHeader>
          <CardTitle className="text-destructive">{t('dangerTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">{t('dangerBody')}</p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}

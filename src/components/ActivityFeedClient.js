import logger from '@/utils/logger';
('use client');

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  Globe2,
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  MessageSquare,
  Radio,
  RefreshCw,
  Rss,
  Star,
  UserRound,
  Users,
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';
import { fetchActivityFeed } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ActivityFeedEventCard, FEED_EVENT_META } from '@/components/ActivityFeedEventCard';
import { getFeedEventKey } from '@/lib/feedEventKey';
import { cn } from '@/lib/utils';

const FILTER_DEFS = [
  { id: 'all', labelKey: 'filterAll', Icon: Rss },
  { id: 'new_favorite', labelKey: 'filterFavorites', Icon: Heart },
  { id: 'new_comment', labelKey: 'filterComments', Icon: MessageSquare },
  { id: 'new_showcase', labelKey: 'filterShowcase', Icon: ImageIcon },
  { id: 'new_prompt', labelKey: 'filterPrompts', Icon: Star },
];

const FEED_MODE_DEFS = [
  { id: 'following', labelKey: 'modeFollowing', Icon: UserRound },
  { id: 'general', labelKey: 'modeGeneral', Icon: Globe2 },
];

const REALTIME_TABLES = [
  'favorites',
  'comments',
  'prompts',
  'showcase_items',
  'showcase_comments',
  'showcase_votes',
];

const PAGE_SIZE = 12;

function normalizeItems(items) {
  return Array.isArray(items) ? items : [];
}

export function ActivityFeedClient({
  initialFollowingItems = [],
  initialGeneralItems = [],
  initialMode = 'following',
  canUseFollowing = true,
  title,
  description,
}) {
  const t = useTranslations('ActivityFeedPage');
  const locale = useLocale();
  const timeLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  const resolvedTitle = title || t('title');
  const resolvedDescription = description || t('description');

  const [mode, setMode] = React.useState(
    canUseFollowing && initialMode === 'following' ? 'following' : 'general'
  );
  const [followingItems, setFollowingItems] = React.useState(normalizeItems(initialFollowingItems));
  const [generalItems, setGeneralItems] = React.useState(normalizeItems(initialGeneralItems));
  const [filter, setFilter] = React.useState('all');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLive, setIsLive] = React.useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState(() => new Date());
  const supabase = React.useMemo(() => createClient(), []);
  const refreshInFlight = React.useRef(false);

  const feedItems = mode === 'following' ? followingItems : generalItems;
  const isFollowingMode = mode === 'following';

  const setModeItems = React.useCallback((nextMode, items) => {
    if (nextMode === 'following') {
      setFollowingItems(normalizeItems(items));
    } else {
      setGeneralItems(normalizeItems(items));
    }
  }, []);

  const refreshFeed = React.useCallback(
    async ({ silent = false, targetMode = mode } = {}) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (!silent) setIsRefreshing(true);

      try {
        const newItems = await fetchActivityFeed({ mode: targetMode });
        setModeItems(targetMode, newItems);
        setLastUpdatedAt(new Date());
      } catch (error) {
        logger.error('Activity feed refresh failed:', error);
      } finally {
        refreshInFlight.current = false;
        if (!silent) setIsRefreshing(false);
      }
    },
    [mode, setModeItems]
  );

  React.useEffect(() => {
    setFollowingItems(normalizeItems(initialFollowingItems));
  }, [initialFollowingItems]);

  React.useEffect(() => {
    setGeneralItems(normalizeItems(initialGeneralItems));
  }, [initialGeneralItems]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, mode]);

  React.useEffect(() => {
    const channels = REALTIME_TABLES.map((table) =>
      supabase
        .channel(`activity-feed:${table}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => {
          refreshFeed({ silent: true, targetMode: mode });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setIsLive(true);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsLive(false);
          }
        })
    );

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
      setIsLive(false);
    };
  }, [mode, refreshFeed, supabase]);

  const filteredItems = React.useMemo(() => {
    if (filter === 'all') return feedItems;
    return feedItems.filter((item) => item?.event_type === filter);
  }, [feedItems, filter]);

  const visibleItems = React.useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );
  const hasMore = filteredItems.length > visibleCount;

  const filterCounts = React.useMemo(() => {
    const counts = { all: feedItems.length };
    Object.keys(FEED_EVENT_META).forEach((type) => {
      counts[type] = feedItems.filter((item) => item?.event_type === type).length;
    });
    return counts;
  }, [feedItems]);

  const handleModeChange = (nextMode) => {
    if (nextMode === 'following' && !canUseFollowing) return;
    setMode(nextMode);
    setFilter('all');
  };

  return (
    <div className="space-y-6">
      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-sm glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-900/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-purple-800/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <Rss className="h-3.5 w-3.5" aria-hidden="true" />
              {t('liveChip')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {resolvedTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              {resolvedDescription}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="inline-flex items-center gap-2 self-start rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:self-end">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isLive
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
                    : 'bg-muted-foreground/40'
                )}
              />
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              {isLive ? t('live') : t('connecting')}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refreshFeed()}
              disabled={isRefreshing}
              className="self-start sm:self-end"
            >
              {isRefreshing ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {t('refresh')}
            </Button>
            <p className="text-[11px] text-muted-foreground sm:text-right">
              {t('lastUpdated', {
                time: lastUpdatedAt.toLocaleTimeString(timeLocale, {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
          </div>
        </div>
      </header>

      <div
        className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/30 p-1"
        role="tablist"
        aria-label={t('feedSourceAria')}
      >
        {FEED_MODE_DEFS.map(({ id, labelKey, Icon }) => {
          const isActive = mode === id;
          const disabled = id === 'following' && !canUseFollowing;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => handleModeChange(id)}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('filtersAria')}>
        {FILTER_DEFS.map(({ id, labelKey, Icon }) => {
          const isActive = filter === id;
          const count = filterCounts[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(id)}
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm',
                isActive
                  ? 'border-transparent bg-gradient-to-r from-indigo-950 to-purple-800 text-white shadow-md'
                  : 'border-border/60 bg-background text-muted-foreground hover:border-indigo-500/30 hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(labelKey)}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visibleItems.length > 0 ? (
        <div className="space-y-3" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleItems.map((event, index) => (
              <motion.div
                key={getFeedEventKey(event, index)}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <ActivityFeedEventCard event={event} />
              </motion.div>
            ))}
          </AnimatePresence>

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                className="min-w-[200px]"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                {t('showMore')}
                <span className="ml-2 text-xs text-muted-foreground">
                  {t('remaining', { count: filteredItems.length - visibleCount })}
                </span>
              </Button>
            </div>
          ) : filteredItems.length > PAGE_SIZE ? (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              {t('viewingAll', { count: filteredItems.length })}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-950/10">
            <Users className="h-7 w-7 text-indigo-700 dark:text-indigo-300" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            {feedItems.length === 0
              ? isFollowingMode
                ? t('emptyFollowingTitle')
                : t('emptyGeneralTitle')
              : t('emptyFilterTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {feedItems.length === 0
              ? isFollowingMode
                ? t('emptyFollowingBody')
                : t('emptyGeneralBody')
              : t('emptyFilterBody')}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {feedItems.length === 0 && isFollowingMode ? (
              <>
                <Button asChild className="brand-gradient">
                  <Link href="/topluluk">{t('discoverUsers')}</Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => handleModeChange('general')}>
                  {t('switchToGeneral')}
                </Button>
              </>
            ) : null}
            {filter !== 'all' ? (
              <Button type="button" variant="outline" onClick={() => setFilter('all')}>
                {t('showAll')}
              </Button>
            ) : feedItems.length > 0 || !isFollowingMode ? (
              <Button type="button" variant="outline" onClick={() => refreshFeed()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('retry')}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

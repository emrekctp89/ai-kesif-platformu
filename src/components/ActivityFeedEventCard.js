'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Heart, Image as ImageIcon, MessageSquare, Sparkles, Star } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const FEED_EVENT_ICONS = {
  new_favorite: {
    Icon: Heart,
    iconClassName: 'text-rose-500',
    badgeClassName: 'bg-rose-500/10 border-rose-500/20',
  },
  new_comment: {
    Icon: MessageSquare,
    iconClassName: 'text-sky-500',
    badgeClassName: 'bg-sky-500/10 border-sky-500/20',
  },
  new_showcase: {
    Icon: ImageIcon,
    iconClassName: 'text-emerald-500',
    badgeClassName: 'bg-emerald-500/10 border-emerald-500/20',
  },
  new_prompt: {
    Icon: Star,
    iconClassName: 'text-amber-500',
    badgeClassName: 'bg-amber-500/10 border-amber-500/20',
  },
};

export const FEED_EVENT_META = {
  new_favorite: { ...FEED_EVENT_ICONS.new_favorite, labelKey: 'eventFavorite' },
  new_comment: { ...FEED_EVENT_ICONS.new_comment, labelKey: 'eventComment' },
  new_showcase: { ...FEED_EVENT_ICONS.new_showcase, labelKey: 'eventShowcase' },
  new_prompt: { ...FEED_EVENT_ICONS.new_prompt, labelKey: 'eventPrompt' },
};

function formatRelativeTime(value, localeCode) {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: localeCode === 'tr' ? tr : enUS,
    });
  } catch {
    return '';
  }
}

function UserLink({ username, fallback }) {
  if (!username) {
    return <span className="font-semibold text-foreground">{fallback}</span>;
  }

  return (
    <Link href={`/u/${username}`} className="font-semibold text-foreground hover:underline">
      {username}
    </Link>
  );
}

function ToolLink({ slug, name, fallback }) {
  if (!slug || !name) {
    return (
      <span className="font-semibold text-indigo-700 dark:text-indigo-300">{name || fallback}</span>
    );
  }

  return (
    <Link
      href={`/tool/${slug}`}
      className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
    >
      {name}
    </Link>
  );
}

function EventBody({ event }) {
  const t = useTranslations('ActivityFeedPage');
  const details = event?.details || {};

  const userNode = () => <UserLink username={event.username} fallback={t('aUser')} />;
  const toolNode = () => (
    <ToolLink slug={details.tool_slug} name={details.tool_name} fallback={t('aTool')} />
  );

  switch (event.event_type) {
    case 'new_favorite':
      return (
        <p className="text-sm leading-6 text-foreground/90">
          {t.rich('eventFavoriteBody', {
            user: userNode,
            tool: toolNode,
          })}
        </p>
      );
    case 'new_comment':
      return (
        <>
          <p className="text-sm leading-6 text-foreground/90">
            {t.rich('eventCommentBody', {
              user: userNode,
              tool: toolNode,
            })}
          </p>
          {details.comment_content ? (
            <p className="mt-2 line-clamp-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs italic leading-5 text-muted-foreground">
              &quot;{details.comment_content}&quot;
            </p>
          ) : null}
        </>
      );
    case 'new_showcase': {
      const itemTitle = details.item_title || t('newShowcase');
      return (
        <p className="text-sm leading-6 text-foreground/90">
          {t.rich('eventShowcaseBody', {
            user: userNode,
            item: () =>
              details.item_id ? (
                <Link
                  href={`/eserler?eserId=${details.item_id}`}
                  className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  {itemTitle}
                </Link>
              ) : (
                <span className="font-semibold">{itemTitle}</span>
              ),
          })}
        </p>
      );
    }
    case 'new_prompt':
      return (
        <p className="text-sm leading-6 text-foreground/90">
          {t.rich('eventPromptBody', {
            user: userNode,
            tool: toolNode,
          })}
          {details.prompt_title
            ? t('eventPromptTitleSuffix', { title: details.prompt_title })
            : '.'}
        </p>
      );
    default:
      return (
        <p className="text-sm leading-6 text-foreground/90">
          {t.rich('eventDefaultBody', {
            user: userNode,
          })}
        </p>
      );
  }
}

export function getFeedEventKey(event, index = 0) {
  const details = event?.details || {};
  return [
    event?.event_type || 'event',
    event?.username || 'user',
    details.tool_slug || details.item_id || details.prompt_title || index,
    event?.event_time || index,
  ].join('-');
}

export function ActivityFeedEventCard({ event, className }) {
  const t = useTranslations('ActivityFeedPage');
  const locale = useLocale();
  const meta = FEED_EVENT_META[event?.event_type] || {
    labelKey: 'eventActivity',
    Icon: Sparkles,
    iconClassName: 'text-indigo-500',
    badgeClassName: 'bg-indigo-500/10 border-indigo-500/20',
  };
  const { Icon } = meta;
  const details = event?.details || {};
  const relativeTime = formatRelativeTime(event?.event_time, locale);
  const initials = (event?.username || '?').slice(0, 2).toUpperCase();
  const timeLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <Card
      className={cn(
        'overflow-hidden border-border/60 transition-all hover:border-indigo-500/30 hover:shadow-md',
        className
      )}
    >
      <CardContent className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 border border-border/60 sm:h-11 sm:w-11">
            <AvatarImage
              src={event?.avatar_url || undefined}
              alt={event?.username || t('avatarAlt')}
            />
            <AvatarFallback className="bg-indigo-950/10 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm',
              meta.badgeClassName
            )}
            aria-hidden="true"
          >
            <Icon className={cn('h-3.5 w-3.5', meta.iconClassName)} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                meta.badgeClassName,
                meta.iconClassName
              )}
            >
              {t(meta.labelKey)}
            </span>
            {relativeTime ? (
              <time
                dateTime={event?.event_time}
                className="text-xs text-muted-foreground"
                title={
                  event?.event_time
                    ? new Date(event.event_time).toLocaleString(timeLocale)
                    : undefined
                }
              >
                {relativeTime}
              </time>
            ) : null}
          </div>

          <EventBody event={event} />
        </div>

        {event?.event_type === 'new_showcase' && details.item_image_url ? (
          <Link
            href={details.item_id ? `/eserler?eserId=${details.item_id}` : '/eserler'}
            className="hidden shrink-0 sm:block"
          >
            <Image
              src={details.item_image_url}
              alt={details.item_title || t('showcasePreviewAlt')}
              width={64}
              height={64}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-border/60 transition hover:ring-indigo-400/50"
            />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

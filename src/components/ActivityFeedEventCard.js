import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Image as ImageIcon, MessageSquare, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FEED_EVENT_META = {
  new_favorite: {
    label: 'Favori',
    Icon: Heart,
    iconClassName: 'text-rose-500',
    badgeClassName: 'bg-rose-500/10 border-rose-500/20',
  },
  new_comment: {
    label: 'Yorum',
    Icon: MessageSquare,
    iconClassName: 'text-sky-500',
    badgeClassName: 'bg-sky-500/10 border-sky-500/20',
  },
  new_showcase: {
    label: 'Eser',
    Icon: ImageIcon,
    iconClassName: 'text-emerald-500',
    badgeClassName: 'bg-emerald-500/10 border-emerald-500/20',
  },
  new_prompt: {
    label: 'Prompt',
    Icon: Star,
    iconClassName: 'text-amber-500',
    badgeClassName: 'bg-amber-500/10 border-amber-500/20',
  },
};

function formatRelativeTime(value) {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return formatDistanceToNow(date, { addSuffix: true, locale: tr });
  } catch {
    return '';
  }
}

function UserLink({ username }) {
  if (!username) {
    return <span className="font-semibold text-foreground">Bir kullanıcı</span>;
  }

  return (
    <Link href={`/u/${username}`} className="font-semibold text-foreground hover:underline">
      {username}
    </Link>
  );
}

function ToolLink({ slug, name }) {
  if (!slug || !name) {
    return (
      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
        {name || 'bir araç'}
      </span>
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
  const details = event?.details || {};

  switch (event.event_type) {
    case 'new_favorite':
      return (
        <p className="text-sm leading-6 text-foreground/90">
          <UserLink username={event.username} />{' '}
          <ToolLink slug={details.tool_slug} name={details.tool_name} /> aracını favorilerine
          ekledi.
        </p>
      );
    case 'new_comment':
      return (
        <>
          <p className="text-sm leading-6 text-foreground/90">
            <UserLink username={event.username} />{' '}
            <ToolLink slug={details.tool_slug} name={details.tool_name} /> aracına yorum yaptı.
          </p>
          {details.comment_content ? (
            <p className="mt-2 line-clamp-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs italic leading-5 text-muted-foreground">
              &quot;{details.comment_content}&quot;
            </p>
          ) : null}
        </>
      );
    case 'new_showcase':
      return (
        <p className="text-sm leading-6 text-foreground/90">
          <UserLink username={event.username} />{' '}
          {details.item_id ? (
            <Link
              href={`/eserler?eserId=${details.item_id}`}
              className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
            >
              {details.item_title || 'yeni bir eser'}
            </Link>
          ) : (
            <span className="font-semibold">{details.item_title || 'yeni bir eser'}</span>
          )}{' '}
          paylaştı.
        </p>
      );
    case 'new_prompt':
      return (
        <p className="text-sm leading-6 text-foreground/90">
          <UserLink username={event.username} />{' '}
          <ToolLink slug={details.tool_slug} name={details.tool_name} /> için yeni bir prompt
          paylaştı
          {details.prompt_title ? (
            <>
              : <span className="font-medium">&quot;{details.prompt_title}&quot;</span>
            </>
          ) : (
            '.'
          )}
        </p>
      );
    default:
      return (
        <p className="text-sm leading-6 text-foreground/90">
          <UserLink username={event.username} /> yeni bir aktivite paylaştı.
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
  const meta = FEED_EVENT_META[event?.event_type] || {
    label: 'Aktivite',
    Icon: Sparkles,
    iconClassName: 'text-indigo-500',
    badgeClassName: 'bg-indigo-500/10 border-indigo-500/20',
  };
  const { Icon } = meta;
  const details = event?.details || {};
  const relativeTime = formatRelativeTime(event?.event_time);
  const initials = (event?.username || '?').slice(0, 2).toUpperCase();

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
              alt={event?.username || 'Kullanıcı'}
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
              {meta.label}
            </span>
            {relativeTime ? (
              <time
                dateTime={event?.event_time}
                className="text-xs text-muted-foreground"
                title={
                  event?.event_time ? new Date(event.event_time).toLocaleString('tr-TR') : undefined
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
              alt={details.item_title || 'Eser önizlemesi'}
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addComment, deleteComment, getComments } from '@/app/actions/comments';
import { LoaderCircle, MessageSquare, Trash2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useLocale, useTranslations } from 'next-intl';

export function ToolComments({ toolId, toolSlug }) {
  const t = useTranslations('ToolDetail');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? enUS : tr;

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setCurrentUser(user);
    };

    const fetchInitialComments = async () => {
      setIsLoading(true);
      const initial = await getComments(toolId);
      if (!cancelled) {
        setComments(initial || []);
        setIsLoading(false);
      }
    };

    fetchUser();
    fetchInitialComments();

    const channel = supabase
      .channel(`tool-comments-${toolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tool_comments',
          filter: `tool_id=eq.${toolId}`,
        },
        async () => {
          const updatedComments = await getComments(toolId);
          if (!cancelled) setComments(updatedComments || []);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [toolId, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const result = await addComment(toolId, toolSlug, newComment);
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setNewComment('');
      toast.success(t('commentAdded'));
      const updated = await getComments(toolId);
      setComments(updated || []);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm(t('commentDeleteConfirm'))) return;

    const result = await deleteComment(commentId, toolSlug);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('commentDeleted'));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  return (
    <div
      id="tool-comments"
      className="scroll-mt-36 space-y-6 sm:scroll-mt-40"
      aria-labelledby="tool-comments-heading"
    >
      <div>
        <h2
          id="tool-comments-heading"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight"
        >
          <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
          {t('commentsHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? t('commentsLoading')
            : comments.length === 0
              ? t('commentsEmptyHint')
              : t('commentsCount', { count: comments.length })}
        </p>
      </div>

      {currentUser ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-border/50 bg-muted/20 p-4"
          aria-labelledby="tool-comments-heading"
        >
          <Textarea
            placeholder={t('commentPlaceholder')}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[96px] resize-none bg-background"
            rows={3}
            maxLength={2000}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {newComment.length > 0 ? `${newComment.length}/2000` : t('commentTip')}
            </p>
            <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting ? t('commentSubmitting') : t('commentSubmit')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/25 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-muted-foreground">{t('loginToComment')}</p>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/login">{t('loginCta')}</Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t('commentsLoading')}
          </div>
        ) : null}

        {!isLoading &&
          comments.map((comment) => (
            <article
              key={comment.id}
              className="flex gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={comment.avatar_url || ''} alt="" />
                <AvatarFallback>
                  {(comment.full_name || comment.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-semibold">
                      {comment.full_name || comment.username || t('anonymousUser')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(comment.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                  {currentUser?.id === comment.user_id ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={t('commentDelete')}
                      aria-label={t('commentDelete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {comment.content}
                </p>
              </div>
            </article>
          ))}

        {!isLoading && comments.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {t('commentsEmpty')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

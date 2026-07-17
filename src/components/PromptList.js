'use client';

import * as React from 'react';
import { useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { togglePromptVote } from '@/app/actions';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DeletePromptButton } from './DeletePromptButton';

// Tek bir prompt'u yöneten alt bileşen
function PromptItem({ prompt, user, isVoted, toolSlug }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, toggleOptimisticState] = useOptimistic(
    { isVoted, voteCount: prompt.vote_count },
    (state) => ({
      isVoted: !state.isVoted,
      voteCount: state.isVoted ? state.voteCount - 1 : state.voteCount + 1,
    })
  );

  const handleVoteAction = () => {
    if (!user) {
      toast.error('Oylama yapmak için giriş yapmalısınız.');
      return;
    }
    startTransition(() => {
      const wasVoted = optimisticState.isVoted;
      toggleOptimisticState();
      const formData = new FormData();
      formData.append('promptId', prompt.id);
      formData.append('isVoted', wasVoted.toString());
      togglePromptVote(formData).then((result) => {
        if (result?.error) toast.error(result.error);
      });
    });
  };

  const userProfile = prompt.profiles;
  if (!userProfile) return null;

  const fallback = userProfile.email?.substring(0, 2).toUpperCase() || '??';
  const profileLink = `/u/${userProfile.username}`;
  const isOwner = user?.id === prompt.user_id;

  return (
    <Card className="glass-panel border-border/50">
      <CardContent className="flex gap-4 p-4">
        <div className="flex flex-col items-center gap-1">
          <Button
            onClick={handleVoteAction}
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', optimisticState.isVoted && 'text-primary')}
            disabled={isPending}
            aria-label={optimisticState.isVoted ? 'Oyu geri al' : 'Promptu oyla'}
            aria-pressed={optimisticState.isVoted}
          >
            <ArrowUp className={cn('h-5 w-5', optimisticState.isVoted && 'fill-current')} />
          </Button>
          <span className="text-sm font-bold">{optimisticState.voteCount}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold leading-snug">{prompt.title}</h4>
            {isOwner && <DeletePromptButton promptId={prompt.id} toolSlug={toolSlug} />}
          </div>
          <pre className="my-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">
            {prompt.prompt_text}
          </pre>
          {prompt.notes ? (
            <p className="mt-2 text-xs italic text-muted-foreground">{prompt.notes}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <Link href={profileLink} className="group flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={userProfile.avatar_url} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground group-hover:text-primary">
                {userProfile.username || userProfile.email}
              </p>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Ana Prompt Listesi Bileşeni
export function PromptList({
  prompts,
  user,
  userVotes,
  toolSlug,
  emptyLabel = 'Bu araç için henüz hiç prompt paylaşılmamış.',
}) {
  if (!prompts || prompts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }
  const userVoteSet = new Set((userVotes || []).map((v) => v.prompt_id));
  return (
    <div className="space-y-4">
      {prompts.map((prompt) => (
        <PromptItem
          key={prompt.id}
          prompt={prompt}
          user={user}
          isVoted={userVoteSet.has(prompt.id)}
          toolSlug={toolSlug}
        />
      ))}
    </div>
  );
}

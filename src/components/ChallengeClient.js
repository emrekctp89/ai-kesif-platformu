'use client';

import * as React from 'react';
import { useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { ArrowUp } from 'lucide-react';

import { toggleChallengeVote } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SubmissionCard({ submission, user, isVoted, t }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticVote, toggleOptimisticVote] = useOptimistic(
    { isVoted, voteCount: submission.vote_count },
    (state) => ({
      isVoted: !state.isVoted,
      voteCount: state.isVoted ? state.voteCount - 1 : state.voteCount + 1,
    })
  );

  const title = submission.showcase_items?.title || t('untitled');
  const imageUrl = submission.showcase_items?.image_url;

  const handleVoteAction = () => {
    if (!user) {
      toast.error(t('loginToVote'));
      return;
    }
    startTransition(() => {
      toggleOptimisticVote();
      const formData = new FormData();
      formData.append('submissionId', submission.id);
      toggleChallengeVote(formData);
    });
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <Link
        href={`/eserler?eserId=${submission.showcase_item_id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        prefetch={false}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {t('noImage')}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <Button
          onClick={handleVoteAction}
          variant={optimisticVote.isVoted ? 'default' : 'secondary'}
          size="sm"
          className="h-8 rounded-full shadow-md"
          disabled={isPending}
          aria-pressed={optimisticVote.isVoted}
          aria-label={t('voteAria', { title })}
        >
          <ArrowUp
            className={cn('mr-1 h-4 w-4', optimisticVote.isVoted && 'fill-current')}
            aria-hidden="true"
          />
          {optimisticVote.voteCount}
        </Button>
      </div>
    </article>
  );
}

export function ChallengeClient({ submissions, user, userVotes }) {
  const t = useTranslations('ChallengePage');
  const userVoteSet = new Set((userVotes || []).map((v) => v.submission_id));
  const sorted = [...(submissions || [])].sort(
    (a, b) => (Number(b.vote_count) || 0) - (Number(a.vote_count) || 0)
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {sorted.map((sub) => (
        <SubmissionCard
          key={sub.id}
          submission={sub}
          user={user}
          isVoted={userVoteSet.has(sub.id)}
          t={t}
        />
      ))}
    </div>
  );
}

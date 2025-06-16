"use client";

import * as React from "react";
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { togglePromptVote } from "@/app/actions";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeletePromptButton } from "./DeletePromptButton";

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
      toast.error("Oylama yapmak için giriş yapmalısınız.");
      return;
    }
    startTransition(() => {
      const wasVoted = optimisticState.isVoted;
      toggleOptimisticState();
      const formData = new FormData();
      formData.append("promptId", prompt.id);
      formData.append("isVoted", wasVoted.toString());
      togglePromptVote(formData).then((result) => {
        if (result?.error) toast.error(result.error);
      });
    });
  };

  const userProfile = prompt.profiles;
  if (!userProfile) return null;

  const fallback = userProfile.email?.substring(0, 2).toUpperCase() || "??";
  const profileLink = `/u/${userProfile.username}`;
  const isOwner = user?.id === prompt.user_id;

  return (
    <Card>
      <CardContent className="p-4 flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <Button
            onClick={handleVoteAction}
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", optimisticState.isVoted && "text-primary")}
            disabled={isPending}
          >
            <ArrowUp
              className={cn(
                "h-5 w-5",
                optimisticState.isVoted && "fill-current"
              )}
            />
          </Button>
          <span className="text-sm font-bold">{optimisticState.voteCount}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold">{prompt.title}</h4>
            {isOwner && (
              <DeletePromptButton promptId={prompt.id} toolSlug={toolSlug} />
            )}
          </div>
          <pre className="text-sm bg-muted p-3 rounded-md my-2 whitespace-pre-wrap font-mono">
            {prompt.prompt_text}
          </pre>
          {prompt.notes && (
            <p className="text-xs text-muted-foreground italic mt-2">
              {prompt.notes}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {/* DEĞİŞİKLİK: Avatar ve kullanıcı adı artık bir link */}
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
export function PromptList({ prompts, user, userVotes, toolSlug }) {
  if (!prompts || prompts.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        Bu araç için henüz hiç prompt paylaşılmamış.
      </p>
    );
  }
  const userVoteSet = new Set(userVotes.map((v) => v.prompt_id));
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

/*
 * ---------------------------------------------------
 * 1. YENİ BİLEŞEN: src/components/LaunchCard.js
 * Bu, tek bir lansmanı gösteren ve oylama mantığını içeren
 * interaktif bir istemci bileşenidir.
 * ---------------------------------------------------
 */
"use client";

import * as React from "react";
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toggleLaunchVote } from "@/app/actions";
import toast from "react-hot-toast";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function LaunchCard({ launch, user, isVoted }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticVote, toggleOptimisticVote] = useOptimistic(
    { isVoted, voteCount: launch.vote_count },
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
      toggleOptimisticVote();
      const formData = new FormData();
      formData.append("launchId", launch.id);
      toggleLaunchVote(formData).then((result) => {
        if (result?.error) {
          toast.error(result.error);
        }
      });
    });
  };

  const fallback = (launch.author_username || "AI")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 flex items-center gap-4">
        {/* Oylama Butonu */}
        <div className="flex flex-col items-center gap-1">
          <Button
            onClick={handleVoteAction}
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 border",
              optimisticVote.isVoted && "border-primary text-primary"
            )}
          >
            <ArrowUp
              className={cn(
                "h-5 w-5",
                optimisticVote.isVoted && "fill-current"
              )}
            />
          </Button>
          <span className="text-sm font-bold">{optimisticVote.voteCount}</span>
        </div>

        {/* Ana İçerik */}
        <div className="flex-1">
          <Link href={`/tool/${launch.tool_slug}`} className="group">
            <h3 className="font-bold group-hover:text-primary">
              {launch.tool_name}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">{launch.tagline}</p>
          <div className="flex items-center gap-2 mt-2">
            <Link href={`/u/${launch.author_username}`}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={launch.author_avatar_url} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
            </Link>
            <Link href={`/u/${launch.author_username}`}>
              <p className="text-xs text-muted-foreground hover:text-primary">
                {launch.author_username}
              </p>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

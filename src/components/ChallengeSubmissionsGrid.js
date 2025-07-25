/*
* ---------------------------------------------------
* 1. YENİ BİLEŞEN: src/components/ChallengeSubmissionsGrid.js
* Bu, yarışmaya gönderilen eserleri listeleyen ve oylama
* mantığını içeren interaktif istemci bileşenidir.
* ---------------------------------------------------
*/
'use client'

import * as React from 'react'
import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toggleChallengeVote } from '@/app/actions'
import toast from 'react-hot-toast'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

function SubmissionCard({ submission, user, isVoted }) {
    const [isPending, startTransition] = useTransition();
    const [optimisticVote, toggleOptimisticVote] = useOptimistic(
        { isVoted, voteCount: submission.vote_count },
        (state) => ({
            isVoted: !state.isVoted,
            voteCount: state.isVoted ? state.voteCount - 1 : state.voteCount + 1
        })
    );

    const handleVoteAction = () => {
        if (!user) { toast.error("Oylama yapmak için giriş yapmalısınız."); return; }
        startTransition(() => {
            toggleOptimisticVote();
            const formData = new FormData();
            formData.append('submissionId', submission.id);
            toggleChallengeVote(formData).then(result => { if (result?.error) toast.error(result.error); });
        });
    };

    return (
        <Card className="overflow-hidden">
            <Link href={`/eserler?eserId=${submission.showcase_item_id}`} className="group block">
                <div className="aspect-square relative">
                    <Image 
                        src={submission.showcase_items.image_url} 
                        alt={submission.showcase_items.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                    />
                </div>
            </Link>
            <CardContent className="p-3 flex items-center justify-between">
                <Link href={`/u/${submission.profiles.username}`} className="flex items-center gap-2 group">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={submission.profiles.avatar_url} />
                        <AvatarFallback>{submission.profiles.username?.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold group-hover:text-primary">{submission.profiles.username}</p>
                </Link>
                <div className="flex items-center gap-2">
                    <Button onClick={handleVoteAction} variant="outline" size="sm" className={cn(optimisticVote.isVoted && "text-primary")}>
                        <ArrowUp className={cn("h-4 w-4 mr-1.5", optimisticVote.isVoted && "fill-current")} />
                        {optimisticVote.voteCount}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export function ChallengeSubmissionsGrid({ submissions, user, userVotes }) {
    const userVoteSet = new Set(userVotes.map(v => v.submission_id));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {submissions.map(sub => (
                <SubmissionCard 
                    key={sub.id}
                    submission={sub}
                    user={user}
                    isVoted={userVoteSet.has(sub.id)}
                />
            ))}
        </div>
    )
}


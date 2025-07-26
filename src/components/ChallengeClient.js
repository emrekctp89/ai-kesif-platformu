'use client'

import * as React from 'react'
import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { toggleChallengeVote } from '@/app/actions'
import toast from 'react-hot-toast'
import { ArrowUp } from 'lucide-react'
import { cn } from "@/lib/utils"

// Tek bir yarışma gönderisini gösteren ve oylama mantığını içeren alt bileşen
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
        if (!user) { 
            toast.error("Oylama yapmak için giriş yapmalısınız."); 
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
        <div className="group relative">
            <Link href={`/eserler?eserId=${submission.showcase_item_id}`}>
                <div className="aspect-square relative rounded-lg overflow-hidden border">
                    <Image 
                        src={submission.showcase_items.image_url} 
                        alt={submission.showcase_items.title} 
                        fill 
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                </div>
            </Link>
            <div className="absolute bottom-2 right-2">
                <Button 
                    onClick={handleVoteAction} 
                    variant={optimisticVote.isVoted ? "default" : "secondary"} 
                    size="sm" 
                    className="h-8 shadow-md"
                    disabled={isPending}
                >
                    <ArrowUp className={cn('h-4 w-4 mr-1', optimisticVote.isVoted && 'fill-current')} />
                    {optimisticVote.voteCount}
                </Button>
            </div>
        </div>
    );
}

// Yarışma sayfasının tüm interaktif mantığını yöneten ana istemci bileşeni
export function ChallengeClient({ submissions, user, userVotes }) {
    const userVoteSet = new Set(userVotes.map(v => v.submission_id));
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {submissions.map(sub => (
                <SubmissionCard 
                    key={sub.id}
                    submission={sub}
                    user={user}
                    isVoted={userVoteSet.has(sub.id)}
                />
            ))}
        </div>
    );
}

"use client";

import * as React from "react";
import {
  useOptimistic,
  useTransition,
  useEffect,
  useState,
  useRef,
} from "react";
import Link from "next/link";
import Image from "next/image"; // Next.js'in Image bileşenini import ediyoruz
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  getShowcaseItemDetails,
  addShowcaseComment,
  toggleShowcaseVote,
} from "@/app/actions";
import { Lightbulb, Sparkles } from 'lucide-react'



// Oylama Butonu
function VoteButton({ item, isInitiallyVoted, user, onVote }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, toggleOptimisticState] = useOptimistic(
    { isVoted: isInitiallyVoted, voteCount: item.vote_count || 0 },
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
      formData.append("itemId", item.id);
      formData.append("isVoted", wasVoted.toString());

      toggleShowcaseVote(formData).then((result) => {
        if (result?.error) {
          toast.error(result.error);
        } else {
          onVote();
        }
      });
    });
  };

  return (
    <Button
      onClick={handleVoteAction}
      variant="outline"
      className="flex items-center gap-2"
      disabled={isPending}
    >
      <ArrowUp
        className={cn(
          "h-5 w-5",
          optimisticState.isVoted && "text-primary fill-current"
        )}
      />
      <span className="font-bold">{optimisticState.voteCount}</span>
    </Button>
  );
}

// Yorum Formu
function CommentForm({ itemId, onCommentAdded }) {
  const formRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  const handleFormSubmit = (formData) => {
    startTransition(async () => {
      const result = await addShowcaseComment(formData);
      if (result?.success) {
        toast.success(result.success);
        formRef.current?.reset();
        onCommentAdded();
      } else {
        toast.error(result.error || "Bir hata oluştu.");
      }
    });
  };

  return (
    <form
      ref={formRef}
      action={handleFormSubmit}
      className="flex items-start gap-2 pt-4 border-t"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <Textarea
        name="content"
        placeholder="Bu eser hakkında bir yorum yaz..."
        required
        rows={2}
        disabled={isPending}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "..." : "Gönder"}
      </Button>
    </form>
  );
}

// Ana Modal İçerik Bileşeni
export function ShowcaseDetailModal({
  item,
  onNavigate,
  hasNext,
  hasPrev,
  user,
}) {
 const [details, setDetails] = useState({ comments: [], isVoted: false });
const creativeProcess = details?.creativeProcess;

  const [isLoading, setIsLoading] = useState(true);

  const fetchDetails = React.useCallback(async () => {
    if (!item) return;
    setIsLoading(true);
    const result = await getShowcaseItemDetails(item.id);
    setDetails(result);
    setIsLoading(false);
  }, [item]);

  useEffect(() => {
    if (item) {
      fetchDetails();
    }
  }, [item, fetchDetails]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && hasNext) onNavigate("next");
      else if (e.key === "ArrowLeft" && hasPrev) onNavigate("prev");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, hasPrev, onNavigate]);

  if (!item) return null;

  const userEmail = item.author_email || "Anonim";
  const fallback = userEmail.substring(0, 2).toUpperCase();

  return (
    <DialogContent className="max-w-6xl w-full h-[90vh] p-0 flex">
      <DialogHeader className="sr-only">
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>{item.description}</DialogDescription>
      </DialogHeader>

      <div className="relative bg-muted w-2/3 flex items-center justify-center">
        {item.content_type === "Görsel" ? (
          // DEĞİŞİKLİK: <img> yerine <Image> kullanıyoruz
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            className="object-contain"
            sizes="66vw"
          />
        ) : (
          <div className="p-8 h-full w-full">
            <pre className="text-sm bg-background/50 p-4 rounded-md my-2 whitespace-pre-wrap font-mono h-full overflow-y-auto">
              {item.content_text}
            </pre>
          </div>
        )}
        {hasPrev && (
          <button
            onClick={() => onNavigate("prev")}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-1 transition hover:bg-black z-10"
          >
            <ArrowLeftCircle className="w-8 h-8" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => onNavigate("next")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-1 transition hover:bg-black z-10"
          >
            <ArrowRightCircle className="w-8 h-8" />
          </button>
        )}
      </div>

      <div className="w-1/3 p-6 flex flex-col bg-card overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.author_avatar_url} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{userEmail}</p>
              <p className="text-xs text-muted-foreground">Oluşturan</p>
            </div>
          </div>
          <VoteButton
            item={item}
            isInitiallyVoted={details.isVoted}
            user={user}
            onVote={fetchDetails}
          />
        </div>

        <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
        <p className="text-muted-foreground text-sm mb-4">{item.description}</p>

        <div className="flex-grow space-y-4 pt-4 mt-4 border-t">
          <h3 className="text-sm font-semibold">
            Yorumlar ({details.comments.length})
          </h3>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">
              Yorumlar yükleniyor...
            </p>
          ) : details.comments.length > 0 ? (
            details.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback>
                    {comment.profiles?.email.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{comment.profiles?.email}</p>
                  <p className="text-muted-foreground">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Henüz yorum yok.</p>
          )}
        </div>

        {user && <CommentForm itemId={item.id} onCommentAdded={fetchDetails} />}
        {/* YENİ: Sahne Arkası (Yaratıcı Yolculuk) Bölümü */}
                {creativeProcess && (
                    <div className="space-y-4 pt-4 mt-4 border-t">
                        <h3 className="text-sm font-semibold">Sahne Arkası</h3>
                        <div className="space-y-3 text-xs">
                            <div>
                                <p className="font-medium text-muted-foreground">İlk Fikir:</p>
                                <p className="italic p-2 bg-muted/50 rounded-md">&quot;{creativeProcess.initial_prompt}&quot;</p>
                            </div>
                            <div>
                                <p className="font-medium text-muted-foreground flex items-center gap-1"><Lightbulb className="w-3 h-3" />AI Mentor Tavsiyesi:</p>
                                <p className="italic p-2 bg-muted/50 rounded-md">&quot;{creativeProcess.mentor_feedback}&quot;</p>
                            </div>
                            <div>
                                <p className="font-medium text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" />Son Prompt:</p>
                                <p className="italic p-2 bg-muted/50 rounded-md">&quot;{creativeProcess.final_prompt}&quot;</p>
                            </div>
                        </div>
                    </div>
                )}
      </div>
    </DialogContent>
  );
}

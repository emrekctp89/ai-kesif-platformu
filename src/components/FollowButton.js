"use client";

import { useTransition } from "react";
import { useOptimistic } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollowUser } from "@/app/actions";
import toast from "react-hot-toast";
import { UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetUserId,
  targetUsername,
  isInitiallyFollowing,
}) {
  const [isPending, startTransition] = useTransition();
  // Arayüzün anında güncellenmesi için useOptimistic kullanıyoruz
  const [isFollowing, toggleIsFollowing] = useOptimistic(
    isInitiallyFollowing,
    (state) => !state
  );

  const handleFollowAction = () => {
    startTransition(() => {
      toggleIsFollowing();
      const formData = new FormData();
      formData.append("targetUserId", targetUserId);
      formData.append("targetUsername", targetUsername);

      toggleFollowUser(formData).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          // Hata durumunda iyimser güncellemeyi geri al
          toggleIsFollowing();
        }
      });
    });
  };

  return (
    <Button
      onClick={handleFollowAction}
      variant={isFollowing ? "secondary" : "default"}
      disabled={isPending}
      className={cn("transition-all", isFollowing && "text-foreground")}
    >
      {isFollowing ? (
        <>
          <UserCheck className="mr-2 h-4 w-4" />
          Takip Ediliyor
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Takip Et
        </>
      )}
    </Button>
  );
}

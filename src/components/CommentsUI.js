"use client";

import * as React from "react";
import Link from "next/link";
import { addComment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CommentsUI({ user, comments, toolId, toolSlug }) {
  const formRef = React.useRef(null);

  async function handleFormSubmit(formData) {
    const result = await addComment(formData);
    if (result?.success) {
      formRef.current?.reset();
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Yorumlar ({comments?.length || 0})</h2>

      {user && (
        <form
          ref={formRef}
          action={handleFormSubmit}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="toolId" value={toolId} />
          <input type="hidden" name="toolSlug" value={toolSlug} />
          <div className="flex items-start gap-4">
            <Avatar>
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Textarea
              name="content"
              placeholder="Bu araç hakkındaki düşüncelerini paylaş..."
              required
              rows={3}
              className="flex-1"
            />
          </div>
          <Button type="submit" className="self-end">
            Yorum Yap
          </Button>
        </form>
      )}

      <hr className="border-border" />

      {!comments || comments.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          Henüz yorum yapılmamış. İlk yorumu sen yap!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            const userProfile = comment.profiles;
            if (!userProfile) return null;

            const fallback =
              userProfile.email?.substring(0, 2).toUpperCase() || "??";
            const profileLink = `/u/${userProfile.username}`;

            return (
              <div key={comment.id} className="flex items-start gap-4">
                <Link href={profileLink}>
                  <Avatar>
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={profileLink}
                      className="font-semibold text-sm hover:text-primary transition-colors"
                    >
                      {userProfile.username || userProfile.email}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <p className="text-foreground mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

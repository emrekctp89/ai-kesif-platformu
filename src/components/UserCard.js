/*
 * ---------------------------------------------------
 * 1. YENİ BİLEŞEN: src/components/UserCard.js
 * Bu, tek bir kullanıcıyı gösteren ve takip etme mantığını içeren
 * interaktif bir istemci bileşenidir.
 * ---------------------------------------------------
 */
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./FollowButton";
import { Award } from "lucide-react";

export function UserCard({ user, currentUser, isInitiallyFollowing }) {
  const displayName = user.username || user.email;
  const fallback = displayName.substring(0, 2).toUpperCase();
  const profileLink = user.username ? `/u/${user.username}` : "#";

  // Kullanıcı kendi kartını görüyorsa "Takip Et" butonunu gösterme
  const showFollowButton = currentUser && currentUser.id !== user.id;

  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center text-center">
        <Link href={profileLink}>
          <Avatar className="w-20 h-20 mb-4 border-2">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
          </Avatar>
        </Link>
        <Link href={profileLink}>
          <p className="font-bold hover:text-primary">{displayName}</p>
        </Link>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
          <Award className="w-4 h-4 text-yellow-500" />
          <span>
            {user.reputation_points ||
              user.points_earned ||
              user.follower_count ||
              0}
          </span>
          <span className="hidden sm:inline-block">
            {user.points_earned
              ? "Puan Kazandı"
              : user.follower_count
                ? "Takipçi"
                : "Puan"}
          </span>
        </div>
        <div className="mt-4 w-full">
          {showFollowButton && (
            <FollowButton
              targetUserId={user.id}
              targetUsername={user.username}
              isInitiallyFollowing={isInitiallyFollowing}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

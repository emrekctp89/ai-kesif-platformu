'use client'

import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from './FollowButton';
import { Award, Users, TrendingUp } from 'lucide-react'; // Gerekli ikonları import ediyoruz

// DEĞİŞİKLİK: Kart artık hangi bağlamda kullanıldığını ('context') bir prop olarak alıyor.
export function UserCard({ user, currentUser, isInitiallyFollowing, context }) {
    const displayName = user.username || user.email;
    const fallback = displayName ? displayName.substring(0, 2).toUpperCase() : '??';
    const profileLink = user.username ? `/u/${user.username}` : '#';

    const showFollowButton = currentUser && currentUser.id !== user.id;

    // Bağlama göre hangi istatistiğin gösterileceğini belirleyen fonksiyon
    const renderStat = () => {
        switch (context) {
            case 'weekly_stars':
                return (
                    <div className="flex items-center gap-1" title="Bu Hafta Kazanılan Puan">
                        <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-bold text-green-500">{user.points_earned || 0} Puan Kazandı</span>
                    </div>
                );
            case 'most_followed':
                return (
                    <div className="flex items-center gap-1" title="Takipçi Sayısı">
                        <Users className="w-4 h-4" />
                        <span>{user.follower_count || 0} Takipçi</span>
                    </div>
                );
            default: // 'newest_members' ve diğer tüm durumlar için
                return (
                    <div className="flex items-center gap-1" title="Toplam İtibar Puanı">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span>{user.reputation_points || 0} Puan</span>
                    </div>
                );
        }
    };

    return (
        <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
                <Link href={profileLink}>
                    <Avatar className="w-20 h-20 mb-4 border-2 hover:border-primary transition-colors">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
                    </Avatar>
                </Link>
                <Link href={profileLink}>
                    <p className="font-bold hover:text-primary truncate w-full">{displayName}</p>
                </Link>
                
                {/* DEĞİŞİKLİK: Artık bağlama göre doğru istatistik gösteriliyor */}
                <div className="text-sm text-muted-foreground mt-2">
                    {renderStat()}
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

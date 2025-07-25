import { createClient } from '@/utils/supabase/server';
import { ChallengeManager } from '../../components/ChallengeManager.js';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// DEĞİŞİKLİK: Bu fonksiyon artık bir yarışmanın "gerçekten" aktif olup olmadığını
// başlangıç ve bitiş tarihlerine göre kontrol ediyor.
async function getActiveChallenge() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('challenges')
        .select(`
            *,
            challenge_submissions (
                id,
                vote_count,
                showcase_item_id,
                showcase_items ( title, image_url )
            )
        `)
        .eq('status', 'Aktif')
        .lte('start_date', new Date().toISOString()) // Başlangıç tarihi bugün veya daha önce olmalı
        .gte('end_date', new Date().toISOString())   // Bitiş tarihi bugün veya daha sonra olmalı
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
    
    if (error) {
        // Hata olması normal, aktif yarışma olmayabilir.
        return null;
    }
    return data;
}

export const metadata = {
    title: 'Haftalık Yarışma | AI Keşif Platformu',
    description: 'Topluluğun katıldığı haftalık yaratıcılık yarışmalarını keşfedin ve en iyi eserlere oy verin.',
};

export default async function ChallengePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const challenge = await getActiveChallenge();

    let userVotes = [];
    if (user && challenge) {
        const { data } = await supabase
            .from('challenge_submission_votes')
            .select('submission_id')
            .eq('user_id', user.id)
            .in('submission_id', challenge.challenge_submissions.map(s => s.id));
        userVotes = data || [];
    }

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4">
            <div className="text-center mb-12">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
                    Haftalık Yarışma
                </h1>
                {challenge ? (
                    <>
                        <h2 className="mt-4 text-2xl font-semibold text-primary">{challenge.title}</h2>
                        <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">
                            {challenge.description}
                        </p>
                    </>
                ) : (
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Şu anda aktif bir yarışma bulunmuyor. Yakında tekrar kontrol edin!
                    </p>
                )}
            </div>

            {challenge ? (
                <ChallengeClient 
                    submissions={challenge.challenge_submissions}
                    user={user}
                    userVotes={userVotes}
                />
            ) : (
                // Aktif yarışma yoksa, kullanıcıyı yeni eserler paylaşmaya teşvik et
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Yeni bir yarışma başladığında haberdar olmak için takipte kalın. O zamana kadar, kendi eserlerinizi paylaşabilirsiniz!</p>
                    <Button asChild>
                        <Link href="/profile">Eserlerimi Yönet</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}

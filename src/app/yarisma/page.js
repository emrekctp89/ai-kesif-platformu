import { createClient } from '@/utils/supabase/server';
import { ChallengeClient } from '@/components/ChallengeClient';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SubmitToShowcaseChallengeDialog } from '@/components/SubmitToShowcaseChallengeDialog'; // Yeni bileşeni import ediyoruz


// Aktif olan son yarışmayı ve tüm gönderimlerini çeken fonksiyon
async function getActiveChallenge() {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('challenges')
        // DEĞİŞİKLİK: Supabase'e, hangi ilişkiyi kullanacağını açıkça belirtiyoruz.
        .select(`
            *,
            challenge_submissions!challenge_submissions_challenge_id_fkey (
                id,
                vote_count,
                showcase_item_id,
                showcase_items ( title, image_url )
            )
        `)
        .eq('status', 'Aktif')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
    
    if (error) {
        console.error("Aktif yarışma çekilirken hata:", error);
        return null;
    }
    return data;
}

export const metadata = {
    title: 'Haftalık Yarışma | AI Keşif Platformu',
    description: 'Topluluğun katıldığı haftalık yaratıcılık yarışmalarını keşfedin ve en iyi eserlere oy verin.',
};

// YENİ: Bir kullanıcının yarışmaya gönderebileceği eserlerini çeken fonksiyon
async function getUserShowcaseItems(userId) {
    if (!userId) return [];
    const supabase = createClient();
    const { data, error } = await supabase
        .from('showcase_items')
        .select('id, title, image_url')
        .eq('user_id', userId)
        .eq('is_approved', true);
    if (error) return [];
    return data;
}

export default async function ChallengePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
     const [challenge, userShowcaseItems] = await Promise.all([
        getActiveChallenge(),
        getUserShowcaseItems(user?.id)
    ]);

    let userVotes = [];
    if (user && challenge && challenge.challenge_submissions) {
        const submissionIds = challenge.challenge_submissions.map(s => s.id);
        if (submissionIds.length > 0) {
            const { data } = await supabase
                .from('challenge_submission_votes')
                .select('submission_id')
                .eq('user_id', user.id)
                .in('submission_id', submissionIds);
            userVotes = data || [];
        }
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
            {/* YENİ: "Yarışmaya Katıl" butonu */}
            {user && challenge && (
                <div className="flex justify-center mb-8">
                    <SubmitToShowcaseChallengeDialog 
                        userShowcaseItems={userShowcaseItems}
                        challengeTitle={challenge.title}
                    />
                </div>
            )}


            {challenge && challenge.challenge_submissions ? (
                <ChallengeClient 
                    submissions={challenge.challenge_submissions}
                    user={user}
                    userVotes={userVotes}
                />
            ) : (
                challenge ? (
                    <p className="text-center text-muted-foreground">Bu yarışmaya henüz katılım olmadı. İlk eseri sen gönder!</p>
                ) : (
                    user && user.email === process.env.ADMIN_EMAIL && (
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">Yeni bir yarışma başlatmak ister misiniz?</p>
                            <Button asChild>
                                <Link href="/admin">Yarışma Yönetimine Git</Link>
                            </Button>
                        </div>
                    )
                )
            )}
        </div>
    );
}

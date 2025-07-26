import { createClient } from '@/utils/supabase/server';
import { ChallengeClient } from '@/components/ChallengeClient';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';





// DEĞİŞİKLİK: Bu fonksiyon artık sadece "bugün" aktif olan yarışmayı arıyor.
async function getActiveChallenge() {
    const supabase = createClient();
    // DEĞİŞİKLİK: Saati ve zaman dilimini kaldırarak, sadece tarihi (YYYY-MM-DD) alıyoruz.
    const today = new Date().toISOString().split('T')[0];

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
        .lte('start_date', today) // Başlangıç tarihi bugün veya daha önce olmalı
        .gte('end_date', today)   // Bitiş tarihi bugün veya daha sonra olmalı
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
    
    if (error) {
        // Hata olması normal, o gün aktif bir yarışma olmayabilir.
        return null;
    }
    return data;
}

export const metadata = {
    title: 'Haftalık Yarışma | AI Keşif Platformu',
    description: 'Topluluğun katıldığı haftalık yaratıcılık yarışmalarını keşfedin ve en iyi eserlere oy verin.',
};


// DEĞİŞİKLİK: Bu fonksiyon artık ChallengeClient bileşenini kullanıyor.
// Bu sayfa, haftalık yarışmayı gösterir ve kullanıcıların oylama yapmasına izin verir.
// Kullanıcı, yarışmaya katılan eserleri görebilir ve oylama yapabilir              



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
                // Aktif yarışma yoksa, admini yeni bir yarışma oluşturmaya teşvik et
                user && user.email === process.env.ADMIN_EMAIL && (
                    <div className="text-center">
                        <p className="text-muted-foreground mb-4">Yeni bir yarışma başlatmak ister misiniz?</p>
                        <Button asChild>
                            <Link href="/admin">Yarışma Yönetimine Git</Link>
                        </Button>
                    </div>
                )
            )}
        </div>
    );
}

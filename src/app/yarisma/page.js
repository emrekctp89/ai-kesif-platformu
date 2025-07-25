/*
* ---------------------------------------------------
* 2. YENİ SAYFA: src/app/yarisma/page.js
* Bu, aktif yarışmayı ve gönderimleri gösteren ana sayfadır.
* ---------------------------------------------------
*/
import { createClient } from '@/utils/supabase/server';
import { ChallengeSubmissionsGrid } from '@/components/ChallengeSubmissionsGrid';
import { Trophy } from 'lucide-react';

// Aktif yarışmayı ve tüm gönderimlerini çeken fonksiyon
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
                showcase_items (title, image_url),
                profiles (username, avatar_url)
            )
        `)
        .eq('status', 'Aktif')
        .order('vote_count', { referencedTable: 'challenge_submissions', ascending: false })
        .limit(1)
        .single();
    
    if (error) { /* Hata yönetimi */ return null; }
    return data;
}

// Giriş yapmış kullanıcının oylarını çeken fonksiyon
async function getUserVotes(userId, submissionIds) {
    if (!userId || !submissionIds || submissionIds.length === 0) return [];
    const supabase = createClient();
    const { data } = await supabase
        .from('challenge_submission_votes')
        .select('submission_id')
        .eq('user_id', userId)
        .in('submission_id', submissionIds);
    return data || [];
}

export const metadata = {
    title: 'Haftalık Yarışma | AI Keşif Platformu',
};

export default async function ChallengePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const activeChallenge = await getActiveChallenge();

    if (!activeChallenge) {
        return (
            <div className="text-center py-24">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Şu Anda Aktif Bir Yarışma Yok</h2>
                <p className="text-muted-foreground">Yeni yarışmalar için bizi takip etmeye devam edin!</p>
            </div>
        );
    }
    
    const submissionIds = activeChallenge.challenge_submissions.map(s => s.id);
    const userVotes = await getUserVotes(user?.id, submissionIds);

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                    {activeChallenge.title}
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    {activeChallenge.description}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    Son Katılım: {new Date(activeChallenge.end_date).toLocaleDateString('tr-TR')}
                </p>
            </div>

            <ChallengeSubmissionsGrid 
                submissions={activeChallenge.challenge_submissions}
                user={user}
                userVotes={userVotes}
            />
        </div>
    );
}

import { createClient } from '@/utils/supabase/server';
import { ChallengeClient } from '@/components/ChallengeClient';
import { Trophy, CalendarClock, CalendarCheck2, CalendarX2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

// Veri çekme fonksiyonunu, adminler için TÜM yarışmaları çekecek şekilde güncelliyoruz
async function getChallengeData(isAdmin) {
    const supabase = createClient();
    
    if (isAdmin) {
        // Eğer kullanıcı admin ise, tüm yarışmaları çek
        const { data, error } = await supabase
            .from('challenges')
            .select(`*, challenge_submissions(*)`)
            .order('start_date', { ascending: false });
        if (error) {
            console.error("Tüm yarışmalar çekilirken hata:", error);
            return { allChallenges: [] };
        }
        return { allChallenges: data };
    } else {
        // Normal kullanıcılar için sadece bugünün aktif yarışmasını çek
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('challenges')
            .select(`*, challenge_submissions(*)`)
            .eq('status', 'Aktif')
            .lte('start_date', today)
            .gte('end_date', today)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();
        if (error) return { activeChallenge: null };
        return { activeChallenge: data };
    }
}

export const metadata = {
    title: 'Haftalık Yarışma | AI Keşif Platformu',
    description: 'Topluluğun katıldığı haftalık yaratıcılık yarışmalarını keşfedin ve en iyi eserlere oy verin.',
};

export default async function ChallengePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.email === process.env.ADMIN_EMAIL;
    
    const { activeChallenge, allChallenges } = await getChallengeData(isAdmin);

    let userVotes = [];
    if (user && activeChallenge && activeChallenge.challenge_submissions) {
        const submissionIds = activeChallenge.challenge_submissions.map(s => s.id);
        if (submissionIds.length > 0) {
            const { data } = await supabase
                .from('challenge_submission_votes')
                .select('submission_id')
                .eq('user_id', user.id)
                .in('submission_id', submissionIds);
            userVotes = data || [];
        }
    }

    // Admin için, yarışmaları durumlarına göre gruplandırıyoruz
    const now = new Date();
    const upcomingChallenges = isAdmin ? allChallenges.filter(c => new Date(c.start_date) > now && c.status === 'Aktif') : [];
    const pastChallenges = isAdmin ? allChallenges.filter(c => new Date(c.end_date) < now || c.status !== 'Aktif') : [];

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4">
            <div className="text-center mb-12">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
                    Haftalık Yarışma
                </h1>
                {activeChallenge ? (
                    <>
                        <h2 className="mt-4 text-2xl font-semibold text-primary">{activeChallenge.title}</h2>
                        <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">{activeChallenge.description}</p>
                    </>
                ) : (
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Şu anda aktif bir yarışma bulunmuyor. Yakında tekrar kontrol edin!
                    </p>
                )}
            </div>

            {activeChallenge && activeChallenge.challenge_submissions ? (
                <ChallengeClient 
                    submissions={activeChallenge.challenge_submissions}
                    user={user}
                    userVotes={userVotes}
                />
            ) : (
                activeChallenge && <p className="text-center text-muted-foreground">Bu yarışmaya henüz katılım olmadı. İlk eseri sen gönder!</p>
            )}

            {/* ADMIN ÖZEL BÖLÜMÜ */}
            {isAdmin && (
                <div className="mt-16 space-y-8">
                    <hr/>
                    <h2 className="text-2xl font-bold text-center">Admin Yönetim Paneli</h2>
                    {/* Yaklaşan Yarışmalar */}
                    {upcomingChallenges.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><CalendarClock className="w-5 h-5"/>Yaklaşan Yarışmalar</h3>
                            <div className="space-y-2">
                                {upcomingChallenges.map(c => (
                                    <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center">
                                        <span>{c.title} ({new Date(c.start_date).toLocaleDateString('tr-TR')})</span>
                                        <Button asChild variant="secondary" size="sm"><Link href={`/admin/challenges/${c.id}/edit`}>Düzenle</Link></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Geçmiş Yarışmalar */}
                    {pastChallenges.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><CalendarX2 className="w-5 h-5"/>Geçmiş Yarışmalar</h3>
                             <div className="space-y-2">
                                {pastChallenges.map(c => (
                                    <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center">
                                        <span>{c.title} <Badge>{c.status}</Badge></span>
                                        <Button asChild variant="secondary" size="sm"><Link href={`/admin/challenges/${c.id}/edit`}>Düzenle</Link></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

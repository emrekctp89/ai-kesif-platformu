/*
* ---------------------------------------------------
* 2. YENİ SAYFA: /admin/challenges/[id]/edit/page.js
* Bu, tek bir yarışmayı düzenlemek için kullanılacak olan sayfadır.
* ---------------------------------------------------
*/
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ChallengeEditor } from '@/components/ChallengeEditor'; // Bu bileşeni bir sonraki adımda oluşturacağız

async function getChallenge(id) {
    const supabase = createClient();
    const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (error || !data) notFound();
    return data;
}

export default async function EditChallengePage({ params }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/');

    const challenge = await getChallenge(params.id);

    return (
        <div className="container mx-auto max-w-2xl py-8">
            <h1 className="text-3xl font-bold mb-6">Yarışmayı Düzenle</h1>
            <ChallengeEditor challenge={challenge} />
        </div>
    );
}

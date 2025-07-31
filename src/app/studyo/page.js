import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { StudioClient } from '@/components/StudioClient';

export const metadata = {
    title: 'AI İçerik Stüdyosu | AI Keşif Platformu',
    description: 'Yapay zeka modellerini kullanarak kendi metinlerinizi ve görsellerinizi yaratın.',
};

export default async function StudioPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
redirect('/login?message=' + encodeURIComponent('AI Stüdyosunu kullanmak için giriş yapmalısınız.'));
    }

    // DEĞİŞİKLİK: Kullanıcının "Pro" olup olmadığını kontrol ediyoruz.
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_price_id')
        .eq('id', user.id)
        .single();

    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    const isProUser = !!profile?.stripe_price_id || isAdmin;

    // Eğer kullanıcı ne Pro ne de Admin ise, üyelik sayfasına yönlendir.
    if (!isProUser) {
redirect('/uyelik?message=' + encodeURIComponent('AI Stüdyosunu kullanmak için Pro üyeliğe yükseltmelisiniz.'));
    }

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
             <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                    AI İçerik Stüdyosu
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Yaratıcılığınızı serbest bırakın. Fikirlerinizi metinlere ve görsellere dönüştürün.
                </p>
            </div>
            <StudioClient />
        </div>
    );
}

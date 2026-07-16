import Link from 'next/link';
import { CheckCircle2, Clock3, SearchCheck } from 'lucide-react';

import { createClient } from '@/utils/supabase/server';
import SubmitForm from '@/components/SubmitForm';
import { Button } from '@/components/ui/button';
import { AnalyticsEvent } from '@/components/AnalyticsEvent';
import { sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';

async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, name, slug').order('name');
  return sortCategoriesByCanonicalOrder(data || []);
}

export default async function SubmitPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const categories = await getCategories();
  const { status, message } = await searchParams;

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center sm:py-20">
        <AnalyticsEvent name="tool_submission_completed" />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 aria-hidden="true" className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Öneriniz alındı</h1>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">
          Teşekkürler! Araç editör incelemesine gönderildi. Uygun bulunursa platformda yayınlanacak
          ve e-posta ile bilgi verilecek.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Araçları keşfet</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/submit">Başka bir araç öner</Link>
          </Button>
        </div>
      </div>
    );
  }

  const steps = [
    { icon: Clock3, title: '2 dakikalık form', text: 'Temel ürün bilgileri yeterli.' },
    { icon: SearchCheck, title: 'Editör incelemesi', text: 'Kalite ve uygunluk kontrol edilir.' },
    { icon: CheckCircle2, title: 'Ücretsiz yayın', text: 'Onaylanan araçlar dizine eklenir.' },
  ];

  return (
    <div className="mx-auto max-w-4xl py-8 sm:py-12">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="text-sm font-semibold text-primary">AI Keşif dizinine katkıda bulunun</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Yeni bir AI aracı öner
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Keşfettiğiniz faydalı bir aracı toplulukla paylaşın. Form yaklaşık iki dakika sürer.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          className="mx-auto mb-5 max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-lg border bg-card p-4">
            <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <SubmitForm categories={categories} user={user} />
    </div>
  );
}

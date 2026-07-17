import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bot } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CoPilotClient } from '@/components/CoPilotClient';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminOps' });
  return generatePageMetadata({
    title: t('copilotMetaTitle'),
    description: t('copilotSubtitle'),
    path: locale === 'en' ? '/en/admin/co-pilot' : '/admin/co-pilot',
    noindex: true,
  });
}

export default async function CoPilotPage({ params }) {
  await params;
  const t = await getTranslations('AdminOps');
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/login');
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
      <section className="brand-surface relative shrink-0 overflow-hidden rounded-3xl p-4 shadow-lg glass-panel sm:p-5">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="brand-chip mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-inner">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              {t('copilotChip')}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t('copilotTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('copilotSubtitle')}</p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button min-h-9 shrink-0 gap-2"
          >
            <Link href="/admin" prefetch={false}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('backToAdmin')}
            </Link>
          </Button>
        </div>
      </section>
      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-border/50 glass-panel">
        <CoPilotClient />
      </div>
    </div>
  );
}

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { BulkImportClient } from '@/components/BulkImportClient';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminOps' });
  return generatePageMetadata({
    title: t('bulkMetaTitle'),
    description: t('bulkSubtitle'),
    path: locale === 'en' ? '/en/admin/bulk-import' : '/admin/bulk-import',
    noindex: true,
  });
}

export default async function BulkImportPage({ params }) {
  await params;
  const t = await getTranslations('AdminOps');
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/login');

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-3 py-5 sm:px-4 sm:py-8">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <Database className="h-4 w-4" aria-hidden="true" />
              {t('bulkChip')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('bulkTitle')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t('bulkSubtitle')}
            </p>
          </div>
          <Button asChild variant="outline" className="glass-button min-h-10 shrink-0 gap-2">
            <Link href="/admin" prefetch={false}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('backToAdmin')}
            </Link>
          </Button>
        </div>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <BulkImportClient />
      </div>
    </div>
  );
}

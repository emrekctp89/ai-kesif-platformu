import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CheckCircle2, Clock3, SearchCheck } from 'lucide-react';

import { createClient } from '@/utils/supabase/server';
import SubmitForm from '@/components/SubmitForm';
import { Button } from '@/components/ui/button';
import { AnalyticsEvent } from '@/components/AnalyticsEvent';
import { filterPrimaryCategories, sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';

async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, name, slug').order('name');
  return sortCategoriesByCanonicalOrder(filterPrimaryCategories(data || []));
}

export default async function SubmitPage({ searchParams }) {
  const t = await getTranslations('Submit');
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
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{t('successTitle')}</h1>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">{t('successBody')}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="brand-gradient min-h-11">
            <Link href="/">{t('exploreTools')}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/submit">{t('submitAnother')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const steps = [
    { icon: Clock3, title: t('step1Title'), text: t('step1Text') },
    { icon: SearchCheck, title: t('step2Title'), text: t('step2Text') },
    { icon: CheckCircle2, title: t('step3Title'), text: t('step3Text') },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 sm:space-y-10 sm:py-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="brand-chip mx-auto mb-3 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold">
            {t('heroBadge')}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('heroTitle')}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">{t('heroSubtitle')}</p>
        </div>
      </section>

      {message ? (
        <div
          role="alert"
          className="mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-panel rounded-2xl border border-border/50 bg-card p-4">
            <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-1 shadow-sm sm:p-2">
        <SubmitForm categories={categories} user={user} />
      </div>
    </div>
  );
}

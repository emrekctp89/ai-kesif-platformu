import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  Code2,
  Database,
  KeyRound,
  ListFilter,
  Search,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { DeveloperPortalClient } from '@/components/DeveloperPortalClient';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DeveloperPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/developer' : '/developer',
    noindex: true,
  });
}

export default async function DeveloperPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DeveloperPage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/developer&message=${encodeURIComponent(t('loginRequired'))}`);
  }

  const flow = [
    { icon: KeyRound, title: t('flowKeyTitle'), body: t('flowKeyBody') },
    { icon: ShieldCheck, title: t('flowAuthTitle'), body: t('flowAuthBody') },
    { icon: ServerCog, title: t('flowProcessTitle'), body: t('flowProcessBody') },
    { icon: Braces, title: t('flowResponseTitle'), body: t('flowResponseBody') },
  ];

  const endpoints = [
    {
      icon: ListFilter,
      method: 'GET',
      path: '/api/v1/tools',
      title: t('endpointListTitle'),
      body: t('endpointListBody'),
    },
    {
      icon: Search,
      method: 'GET',
      path: '/api/v1/tools/{slug}',
      title: t('endpointDetailTitle'),
      body: t('endpointDetailBody'),
    },
    {
      icon: Bot,
      method: 'POST',
      path: '/api/v1/kasif/recommend',
      title: t('endpointKasifTitle'),
      body: t('endpointKasifBody'),
    },
  ];

  const productionRules = ['serverSide', 'retry', 'cache', 'observe'];

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Code2 className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t('subtitle')}
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {t('docsHint')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#quick-start"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  {t('quickStartCta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#api-keys"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-muted"
                >
                  {t('createKeyCta')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="developer-flow-title" className="space-y-5">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t('flowEyebrow')}
          </p>
          <h2 id="developer-flow-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('flowTitle')}
          </h2>
          <p className="mt-2 text-muted-foreground">{t('flowDescription')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flow.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="relative rounded-2xl border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <Database className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-bold">{t('chooseEndpointTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('chooseEndpointDescription')}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {endpoints.map((endpoint) => {
              const Icon = endpoint.icon;
              return (
                <article key={endpoint.path} className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                      {endpoint.method}
                    </span>
                    <code className="text-xs sm:text-sm">{endpoint.path}</code>
                  </div>
                  <h3 className="mt-3 font-semibold">{endpoint.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{endpoint.body}</p>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xl font-bold">{t('productionTitle')}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('productionDescription')}</p>
          <ul className="mt-5 space-y-4">
            {productionRules.map((rule) => (
              <li key={rule} className="flex gap-3 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{t(`production${rule.charAt(0).toUpperCase()}${rule.slice(1)}`)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6">
            <strong>{t('scopeTitle')}</strong>{' '}
            <span className="text-muted-foreground">{t('scopeBody')}</span>
          </div>
        </aside>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <DeveloperPortalClient />
      </div>
    </div>
  );
}

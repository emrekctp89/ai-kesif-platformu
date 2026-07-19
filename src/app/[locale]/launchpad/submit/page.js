import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Rocket } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { LaunchForm } from '@/components/LaunchForm';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

async function getLaunchableTools(userId) {
  const supabase = await createClient(await cookies());

  const { data: launchedToolIds, error: launchedError } = await supabase
    .from('launches')
    .select('tool_id');

  if (launchedError) {
    logger.error('Lansmanı yapılmış araçlar çekilirken hata:', launchedError);
    return [];
  }

  const idsToExclude = (launchedToolIds || []).map((item) => item.tool_id);

  let query = supabase
    .from('tools')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_approved', true);

  if (idsToExclude.length > 0) {
    query = query.not('id', 'in', `(${idsToExclude.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Lansmanı yapılabilecek araçlar çekilirken hata:', error);
    return [];
  }
  return data || [];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LaunchpadSubmitPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/launchpad/submit' : '/launchpad/submit',
  });
}

export default async function SubmitLaunchPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LaunchpadSubmitPage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?message=${encodeURIComponent(t('loginRequired'))}`);
  }

  const userTools = await getLaunchableTools(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Rocket className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button mt-5 min-h-9 rounded-full"
          >
            <Link href="/launchpad" prefetch={false}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('back')}
            </Link>
          </Button>
        </div>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <LaunchForm userTools={userTools} />
      </div>
    </div>
  );
}

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ChallengeEditor } from '@/components/ChallengeEditor';
import { Button } from '@/components/ui/button';

async function getChallenge(id) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
  if (error || !data) notFound();
  return data;
}

export default async function EditChallengePage(props) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'AdminOps' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/');

  const challenge = await getChallenge(params.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-3 py-6 sm:px-4 sm:py-8">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            {t('editChallengeChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('editChallengeTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('editChallengeSubtitle')}</p>
          <Button asChild variant="outline" size="sm" className="glass-button mt-5 min-h-9 gap-2">
            <Link href="/admin" prefetch={false}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('backToAdmin')}
            </Link>
          </Button>
        </div>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <ChallengeEditor challenge={challenge} />
      </div>
    </div>
  );
}

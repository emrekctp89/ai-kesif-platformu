import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ContentStudioClient } from '@/components/ContentStudioClient';
import { CreatorAccessGate } from '@/components/CreatorAccessGate';
import {
  getCreatorPostsForCurrentUser,
  hasOpenCreatorApplication,
} from '@/app/actions/contentCreators';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePageMetadata } from '@/utils/seo';
import { MIN_CREATOR_REPUTATION } from '@/lib/contentCreatorRules';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContentStudio' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/icerik' : '/icerik',
    noindex: true,
  });
}

export default async function ContentStudioPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContentStudio' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_content_creator, username, reputation_points')
    .eq('id', user.id)
    .maybeSingle();

  const allowed = isAdmin || Boolean(profile?.is_content_creator);

  if (!allowed) {
    const pending = await hasOpenCreatorApplication(user.id);
    return (
      <CreatorAccessGate
        reputationPoints={profile?.reputation_points || 0}
        minReputation={MIN_CREATOR_REPUTATION}
        alreadyPending={pending}
        username={profile?.username || null}
      />
    );
  }

  const posts = await getCreatorPostsForCurrentUser();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <ContentStudioClient posts={posts} />
    </div>
  );
}

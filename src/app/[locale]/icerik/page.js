import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ContentStudioClient } from '@/components/ContentStudioClient';
import { CreatorApplyForm } from '@/components/CreatorApplyForm';
import { Button } from '@/components/ui/button';
import {
  getCreatorPostsForCurrentUser,
  hasOpenCreatorApplication,
} from '@/app/actions/contentCreators';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePageMetadata } from '@/utils/seo';

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
    .select('is_content_creator, username')
    .eq('id', user.id)
    .maybeSingle();

  const allowed = isAdmin || Boolean(profile?.is_content_creator);

  if (!allowed) {
    const pending = await hasOpenCreatorApplication(user.id);
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-12 pt-6 text-center">
        <div className="brand-surface glass-panel rounded-3xl p-8">
          <PenLine className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{t('lockedTitle')}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{t('lockedBody')}</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            {t('applyReputationHint', { min: 10 })}
          </p>
          <div className="mt-6">
            <CreatorApplyForm
              alreadyPending={pending}
              labels={{
                pitchLabel: t('applyPitchLabel'),
                pitchPlaceholder: t('applyPitchPlaceholder'),
                submit: t('applySubmit'),
                submitting: t('applySubmitting'),
                pendingMessage: t('applyPending'),
              }}
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/blog">{t('ctaBlog')}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/ogren">{t('ctaLearn')}</Link>
            </Button>
          </div>
        </div>
      </div>
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

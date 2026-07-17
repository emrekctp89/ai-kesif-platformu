import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/utils/supabase/server';
import { signOut } from '@/app/actions';
import { Button } from '@/components/ui/button';

export default async function AuthButton() {
  const t = await getTranslations('Common');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-2">
      <Button asChild variant="secondary">
        <Link href="/profile">{t('myProfile')}</Link>
      </Button>
      <form action={signOut}>
        <Button variant="outline">{t('logout')}</Button>
      </form>
    </div>
  ) : (
    <Button asChild>
      <Link href="/login">{t('login')}</Link>
    </Button>
  );
}

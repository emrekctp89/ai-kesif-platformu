'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthCard, AuthEmailField, AuthFooterLink, AuthHeader } from '@/components/auth/auth-ui';

export default function SSOPage() {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSSOLogin = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error(t('ssoEmptyEmail'));
      return;
    }

    const domain = normalizedEmail.split('@')[1];
    if (!domain) {
      toast.error(t('ssoInvalidEmail'));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
      });

      if (error) {
        toast.error(error.message || t('ssoFailed'));
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast.error(t('ssoNotConfigured'));
    } catch {
      toast.error(t('ssoUnexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHeader title={t('ssoTitle')} description={t('ssoDescription')} />

        <AuthCard>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/5 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('ssoChip')}
          </div>

          <form className="grid gap-4" onSubmit={handleSSOLogin}>
            <AuthEmailField
              id="sso-email"
              label={t('ssoEmailLabel')}
              placeholder={t('ssoEmailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Button
              type="submit"
              className="brand-gradient h-11 w-full text-base font-semibold shadow-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('ssoPending')}
                </>
              ) : (
                t('ssoSubmit')
              )}
            </Button>
          </form>
        </AuthCard>

        <AuthFooterLink prompt=" " href="/login" label={t('ssoBack')} align="center" />
      </div>
    </AuthShell>
  );
}

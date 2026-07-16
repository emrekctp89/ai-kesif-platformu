'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Building2, LoaderCircle, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthCard, AuthEmailField, AuthFooterLink, AuthHeader } from '@/components/auth/auth-ui';

export default function SSOPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSSOLogin = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Lütfen şirket e-postanızı girin.');
      return;
    }

    const domain = normalizedEmail.split('@')[1];
    if (!domain) {
      toast.error('Geçerli bir e-posta adresi girin.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
      });

      if (error) {
        toast.error(error.message || 'SSO girişi başarısız oldu.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast.error('Bu alan adı için SSO yapılandırması bulunamadı.');
    } catch {
      toast.error('Giriş yapılırken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHeader
          title="Kurumsal giriş"
          description="Şirket e-postanı gir; yetkili kimlik sağlayıcına (SAML/SSO) yönlendirelim."
        />

        <AuthCard>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/5 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
            <Building2 className="h-3.5 w-3.5" />
            SSO / SAML
          </div>

          <form className="grid gap-4" onSubmit={handleSSOLogin}>
            <AuthEmailField
              id="sso-email"
              label="Şirket e-postası"
              placeholder="ornek@sirketiniz.com"
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
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Yönlendiriliyor…
                </>
              ) : (
                <>
                  SSO ile devam et
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-indigo-500/15 bg-indigo-950/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <p>
              Bu sayfa yalnızca Supabase üzerinde tanımlı kurumsal kimlik sağlayıcıları için
              çalışır. Bireysel hesaplar için{' '}
              <Link
                href="/login"
                className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
              >
                standart giriş
              </Link>
              i kullan.
            </p>
          </div>
        </AuthCard>

        <AuthFooterLink prompt="Standart hesaba mı döneceksin?" href="/login" label="Giriş yap" />
      </div>
    </AuthShell>
  );
}

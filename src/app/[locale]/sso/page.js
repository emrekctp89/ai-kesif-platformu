'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { ShieldAlert, ArrowRight, Building } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function SSOPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSSOLogin = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Lütfen şirket e-postanızı girin.');
      return;
    }

    setLoading(true);

    // Extract domain from email
    const domain = email.split('@')[1];

    if (!domain) {
      toast.error('Geçerli bir e-posta adresi girin.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
      });

      if (error) {
        toast.error(error.message || 'SSO girişi başarısız oldu.');
      } else if (data?.url) {
        // Redirect to Identity Provider URL
        window.location.href = data.url;
      } else {
        toast.error('Bu alan adı için SSO yapılandırması bulunamadı.');
      }
    } catch (err) {
      toast.error('Giriş yapılırken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-24 px-4 flex justify-center min-h-[70vh]">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Kurumsal Giriş</CardTitle>
          <CardDescription>
            Şirket e-postanızı girerek kimlik sağlayıcınıza yönlendirileceksiniz (SAML/SSO).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSSOLogin}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Şirket E-postası
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirketiniz.com"
                required
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full font-bold group" disabled={loading}>
              {loading ? 'Yönlendiriliyor...' : 'SSO ile Devam Et'}
              {!loading && (
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              )}
            </Button>
          </form>

          <div className="mt-6 bg-muted p-4 rounded-md text-sm text-muted-foreground flex gap-3">
            <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
            <p>
              <strong>Not:</strong> Bu sayfa üzerinden sadece Supabase'de yetkilendirilmiş kimlik
              sağlayıcıları (Identity Providers) ile giriş yapılabilir.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center border-t p-4 bg-muted/30">
          <Link href="/login" className="text-sm text-primary hover:underline font-medium">
            ← Standart Girişe Dön
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

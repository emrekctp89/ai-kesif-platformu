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

export const metadata = {
  title: 'Kurumsal SSO Girişi | AI Keşif Platformu',
  description: 'Şirket hesabınızla (SAML/SSO) giriş yapın.',
};

export default function SSOPage() {
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
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Şirket E-postası
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@sirketiniz.com"
                required
                className="w-full"
              />
            </div>
            <Button type="button" className="w-full font-bold group">
              SSO ile Devam Et
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="mt-6 bg-muted p-4 rounded-md text-sm text-muted-foreground flex gap-3">
            <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
            <p>
              <strong>Demo Notu:</strong> Bu sayfa Enterprise B2B müşteriler için tasarlanmış bir
              mock (görsel taslak) sayfasıdır. Gerçek SAML entegrasyonu Supabase Dashboard üzerinden
              WorkOS veya özel Identity Provider ayarları gerektirir.
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

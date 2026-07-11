'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signUp } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-12">
      <div className="mx-auto grid w-full max-w-[350px] gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Kayıt Ol</h1>
          <p className="text-balance text-muted-foreground">
            Yeni bir hesap oluşturmak için bilgilerinizi girin.
          </p>
        </div>
        <form action={signUp} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="signup-email">E-posta</Label>
            <Input
              id="signup-email"
              type="email"
              name="email"
              placeholder="ornek@mail.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signup-password">Şifre</Label>
            <Input
              id="signup-password"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Hesap Oluştur
          </Button>
          {message && (
            <p
              role="alert"
              className="rounded-md bg-foreground/10 p-2 text-center text-sm text-destructive"
            >
              {message}
            </p>
          )}
        </form>
        <div className="text-center text-sm">
          Zaten bir hesabınız var mı?{' '}
          <Link href="/login" className="underline">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  );
}

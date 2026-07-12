'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { oAuthSignIn, signIn } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';
import ScrollingQuotes from '@/components/ScrollingQuotes';

function LoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="mx-auto grid w-[350px] gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-bold">Giriş Yap</h1>
        <p className="text-balance text-muted-foreground">
          Hesabınıza erişmek için bilgilerinizi girin
        </p>
      </div>

      <form action={signIn} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="ornek@mail.com"
            autoComplete="email"
            required
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Şifre</Label>
            <Link
              href="/forgot-password"
              className="ml-auto inline-block text-sm underline hover:text-primary"
            >
              Şifrenizi mi unuttunuz?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>

        {typeof message === 'string' && message.length > 0 && (
          <p
            role="alert"
            className="rounded-md bg-foreground/10 p-2 text-center text-sm text-destructive"
          >
            {message}
          </p>
        )}

        <Button type="submit" className="w-full">
          Giriş Yap
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Veya şununla devam et</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/sso">SSO</Link>
        </Button>
        <form action={oAuthSignIn.bind(null, 'google')}>
          <Button type="submit" variant="outline" className="w-full">
            Google
          </Button>
        </form>
      </div>

      <div className="mt-4 text-center text-sm">
        Hesabınız yok mu?{' '}
        <Link href="/signup" className="underline">
          Kayıt Ol
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <Suspense
          fallback={
            <div className="mx-auto w-[350px] text-center text-sm text-muted-foreground">
              Yükleniyor…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
      <ScrollingQuotes />
    </div>
  );
}

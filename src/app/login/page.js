'use client'

import Link from 'next/link'
import { oAuthSignIn, signIn } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams } from 'next/navigation'
import ScrollingQuotes from '@/components/ScrollingQuotes' // Yeni component'i import ediyoruz

export default function LoginPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Giriş Yap</h1>
            <p className="text-balance text-muted-foreground">
              Hesabınıza erişmek için bilgilerinizi girin
            </p>
          </div>
          {/* Email/Şifre Formu */}
          <form action={signIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" placeholder="ornek@mail.com" required />
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
              <Input id="password" type="password" name="password" required />
            </div>
            {typeof message === 'string' && (
  <p className="text-sm p-2 bg-foreground/10 text-destructive text-center rounded-md">
    {message}
  </p>
)}

            <Button type="submit" className="w-full">
              Giriş Yap
            </Button>
          </form>
          {/* Sosyal Medya Butonları */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Veya şununla devam et
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* <form action={() => oAuthSignIn('github')}>
              <Button variant="outline" className="w-full">GitHub</Button>
            </form> */}
            <form action={oAuthSignIn.bind(null, 'google')}>
  <Button variant="outline" className="w-full">Google</Button>
</form>

          </div>
          <div className="mt-4 text-center text-sm">
            Hesabınız yok mu?{" "}
            <Link href="/signup" className="underline">
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
      {/* Sağ taraftaki boş div'i silip yerine yeni component'i koyuyoruz */}
      <ScrollingQuotes />
    </div>
  )
}

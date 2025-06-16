// src/app/signup/page.js
'use client'

import Link from 'next/link'
import { signUp } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams } from 'next/navigation'

export default function SignupPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="flex items-center justify-center py-12 h-screen">
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Kayıt Ol</h1>
          <p className="text-balance text-muted-foreground">
            Yeni bir hesap oluşturmak için bilgilerinizi girin
          </p>
        </div>
        <form action={signUp} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="ornek@mail.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input id="password" type="password" name="password" required />
          </div>
          <Button type="submit" className="w-full">
            Hesap Oluştur
          </Button>
          {message && (
            <p className="text-sm p-2 bg-foreground/10 text-destructive text-center rounded-md">
              {message}
            </p>
          )}
        </form>
        <div className="mt-4 text-center text-sm">
          Zaten bir hesabınız var mı?{" "}
          <Link href="/login" className="underline">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  )
}
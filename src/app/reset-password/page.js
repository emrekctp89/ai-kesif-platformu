'use client'

import Link from 'next/link'
import { updatePassword } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="flex items-center justify-center py-12 h-screen">
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Yeni Şifre Belirle</h1>
          <p className="text-balance text-muted-foreground">
            Lütfen yeni şifrenizi girin. Şifreniz en az 6 karakter olmalıdır.
          </p>
        </div>
        <form action={updatePassword} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Yeni Şifre</Label>
            <Input
              id="password"
              type="password"
              name="password"
              required
            />
          </div>
          {/* İsteğe bağlı: Şifre tekrarı alanı eklenebilir. Şimdilik basit tutuyoruz. */}
          <Button type="submit" className="w-full">
            Şifreyi Güncelle
          </Button>
          {message && (
            <p className="text-sm p-2 bg-foreground/10 text-destructive text-center rounded-md">
              {message}
            </p>
          )}
        </form>
        <div className="mt-4 text-center text-sm">
          Giriş yapmaya hazır mısın?{" "}
          <Link href="/login" className="underline">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  )
}

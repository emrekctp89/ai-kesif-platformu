'use client'

import * as React from 'react'; // React ve hook'larını kullanmak için import ediyoruz
import { sendContactMessage } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Send } from "lucide-react";

export default function ContactPage() {
  const formRef = React.useRef(null);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [isPending, startTransition] = React.useTransition();
  const [messageLength, setMessageLength] = React.useState(0);
  const [formMessage, setFormMessage] = React.useState(null);
  
  const handleFormAction = (formData) => {
    setFormMessage(null);
    startTransition(async () => {
      const result = await sendContactMessage(formData);

      if (result?.success) {
        setFormMessage({ type: 'success', text: result.success });
        formRef.current?.reset();
        setMessageLength(0);
        setStartedAt(Date.now());
      } else if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      }
    });
  };

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Bize Ulaşın
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Soru, öneri veya geri bildirimleriniz için buradayız.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İletişim Formu</CardTitle>
          <CardDescription>Aşağıdaki formu doldurarak bize doğrudan bir e-posta gönderebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleFormAction} className="space-y-6">
            <input type="hidden" name="started_at" value={startedAt} />
            <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <Label htmlFor="contact-company-website">Şirket web sitesi</Label>
              <Input id="contact-company-website" name="company_website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Adınız Soyadınız</Label>
                <Input id="name" name="name" placeholder="Adınız Soyadınız" minLength={2} maxLength={100} disabled={isPending} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta Adresiniz</Label>
                <Input id="email" name="email" type="email" placeholder="ornek@mail.com" maxLength={254} autoComplete="email" disabled={isPending} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mesajınız</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Mesajınızı buraya yazın..."
                minLength={20}
                maxLength={2000}
                disabled={isPending}
                onChange={(event) => setMessageLength(event.target.value.length)}
                required
                className="min-h-[150px]"
                aria-describedby="contact-message-help"
              />
              <div id="contact-message-help" className="flex justify-between text-xs text-muted-foreground">
                <span>En az 20 karakter yazın.</span>
                <span>{messageLength}/2000</span>
              </div>
            </div>
            
            {/* YENİ: Başarı veya Hata Mesajının Gösterileceği Alan */}
            {formMessage && (
              <div
                role={formMessage.type === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`text-sm p-3 rounded-md text-center ${
                  formMessage.type === 'success' 
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
                  : 'bg-destructive/10 text-destructive'
                }`}
              >
                {formMessage.text}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor…
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="mr-2 h-4 w-4" />
                  Mesajı Gönder
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import * as React from 'react'; // React ve hook'larını kullanmak için import ediyoruz
import { sendContactMessage } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactPage() {
  const formRef = React.useRef(null);
  // Sunucudan gelen başarı veya hata mesajını saklamak için bir state oluşturuyoruz.
  const [formMessage, setFormMessage] = React.useState(null);
  
  const handleFormAction = async (formData) => {
    // Yeni bir gönderimden önce eski mesajı temizle
    setFormMessage(null);
    
    // Server action'ı çağırıp sonucunu bekliyoruz
    const result = await sendContactMessage(formData);

    // Gelen sonuca göre mesaj state'ini güncelliyoruz
    if (result?.success) {
      setFormMessage({ type: 'success', text: result.success });
      // Başarılı olursa formu temizliyoruz
      formRef.current?.reset();
    } else if (result?.error) {
      setFormMessage({ type: 'error', text: result.error });
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Adınız Soyadınız</Label>
                <Input id="name" name="name" placeholder="Adınız Soyadınız" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta Adresiniz</Label>
                <Input id="email" name="email" type="email" placeholder="ornek@mail.com" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mesajınız</Label>
              <Textarea id="message" name="message" placeholder="Mesajınızı buraya yazın..." required className="min-h-[150px]" />
            </div>
            
            {/* YENİ: Başarı veya Hata Mesajının Gösterileceği Alan */}
            {formMessage && (
              <div 
                className={`text-sm p-3 rounded-md text-center ${
                  formMessage.type === 'success' 
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
                  : 'bg-destructive/10 text-destructive'
                }`}
              >
                {formMessage.text}
              </div>
            )}
            
            <Button type="submit" className="w-full">Mesajı Gönder</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

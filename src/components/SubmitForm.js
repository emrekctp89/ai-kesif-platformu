"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, LoaderCircle, Send, ShieldCheck } from "lucide-react";

import { submitTool } from "@/app/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="min-h-12 w-full" disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
          Öneri gönderiliyor...
        </>
      ) : (
        <>
          <Send aria-hidden="true" className="mr-2 h-5 w-5" />
          Öneriyi incelemeye gönder
        </>
      )}
    </Button>
  );
}

export default function SubmitForm({ categories, user }) {
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [startedAt] = useState(() => Date.now());

  return (
    <form
      action={submitTool}
      className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-7"
    >
      <input type="hidden" name="started_at" value={startedAt} />
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <Label htmlFor="company_website">Şirket web sitesi</Label>
        <Input
          id="company_website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Araç adı *</Label>
          <Input id="name" name="name" required minLength={2} maxLength={80} placeholder="Örn. ChatGPT" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">Resmî web sitesi *</Label>
          <Input id="link" name="link" type="url" required maxLength={500} inputMode="url" autoComplete="url" placeholder="https://example.com" aria-describedby="link-help" />
          <p id="link-help" className="text-xs text-muted-foreground">Aracın ana sayfasını veya resmî ürün sayfasını ekleyin.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="description">Kısa açıklama *</Label>
          <span className="text-xs text-muted-foreground">{descriptionLength}/600</span>
        </div>
        <Textarea id="description" name="description" required minLength={20} maxLength={600} onChange={(event) => setDescriptionLength(event.target.value.length)} placeholder="Araç ne işe yarıyor, kimler için uygun ve öne çıkan faydası nedir?" className="min-h-[130px] resize-y" aria-describedby="description-help" />
        <p id="description-help" className="text-xs text-muted-foreground">En az 20 karakter. İnceleme ekibinin aracı doğru değerlendirmesine yardımcı olacak özgün bir açıklama yazın.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_id">En uygun kategori *</Label>
        <select name="category_id" id="category_id" required defaultValue="" className="block min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="" disabled>Bir kategori seçin...</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      {!user && (
        <div className="space-y-2 rounded-lg border bg-secondary/50 p-4">
          <Label htmlFor="suggester_email">E-posta adresiniz *</Label>
          <Input type="email" name="suggester_email" id="suggester_email" required maxLength={254} autoComplete="email" placeholder="ornek@mail.com" aria-describedby="email-help" />
          <p id="email-help" className="flex items-start gap-2 pt-1 text-xs leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Yalnızca önerinizin sonucu hakkında bilgi vermek için kullanılır; pazarlama listesine eklenmez.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-600" />
          Göndermeden önce
        </p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
          <li>• Araç çalışır durumda ve yapay zekâ özelliği sunmalı.</li>
          <li>• Aynı araç daha önce eklenmemiş olmalı.</li>
          <li>• Öneriler yayınlanmadan önce editör incelemesinden geçer.</li>
        </ul>
      </div>

      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground">Gönderim ücretsizdir. Onay garantisi verilmez.</p>
    </form>
  );
}

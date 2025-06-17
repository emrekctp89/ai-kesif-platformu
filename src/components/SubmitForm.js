"use client";

import { submitTool } from "@/app/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea"; // Yeni eklediğimiz bileşen

export default function SubmitForm({ categories, user }) {
  return (
    <form
      action={submitTool}
      className="space-y-6 bg-card p-8 rounded-lg shadow-md border"
    >
      <div>
        <Label htmlFor="name">Araç Adı *</Label>
        <Input id="name" name="name" required placeholder="Örn: ChatGPT" />
      </div>
      <div>
        <Label htmlFor="link">Web Sitesi Linki *</Label>
        <Input
          id="link"
          name="link"
          type="url"
          required
          placeholder="https://example.com"
        />
      </div>
      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Bu aracın ne işe yaradığını ve neden harika olduğunu kısaca anlatın..."
        />
      </div>
      <div>
        <Label htmlFor="category_id">Kategori *</Label>
        {/* Sunucu Eylemleri ile en uyumlu çalışan standart select elementini kullanıyoruz */}
        <select
          name="category_id"
          id="category_id"
          required
          className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Bir kategori seçin...</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* KULLANICI GİRİŞ YAPMAMIŞSA GÖSTERİLECEK ALAN */}
      {!user && (
        <div className="p-4 bg-secondary rounded-lg border space-y-2">
          <Label htmlFor="suggester_email">E-posta Adresiniz *</Label>
          <Input
            type="email"
            name="suggester_email"
            id="suggester_email"
            required
            placeholder="ornek@mail.com"
          />
          <p className="text-xs text-muted-foreground pt-1">
            Öneriniz onaylandığında size bir teşekkür e-postası ve sitenin
            linkini gönderebilmemiz için gereklidir. E-postanız başka hiçbir
            amaçla kullanılmayacaktır.
          </p>
        </div>
      )}

      <div>
        <Button type="submit" className="w-full">
          Öneriyi Gönder
        </Button>
      </div>
    </form>
  );
}

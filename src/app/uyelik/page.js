import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Veritabanından ürünleri ve fiyatları çeken fonksiyon
async function getProducts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, prices(*)")
    .eq("active", true)
    .eq("prices.active", true)
    .order("name");

  if (error) {
    console.error("Ürünler çekilirken hata:", error);
    return [];
  }
  return data;
}

export default async function PricingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(
      "/login?message=Üyelik sayfasını görmek için giriş yapmalısınız."
    );
  }

  const products = await getProducts();
  const proProduct = products.find((p) => p.id === "prod_pro_membership");

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Potansiyelinizi Ortaya Çıkarın
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          "Pro" üyeliğe geçerek platformun tüm gücünü kullanın ve topluluğumuzun
          en değerli üyelerinden biri olun.
        </p>
      </div>

      {/* Fiyatlandırma Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Ücretsiz Plan Kartı */}
        <Card className="rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Temel</CardTitle>
            <CardDescription>Keşfetmeye başlayın.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">Ücretsiz</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Sınırsız araç keşfi
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Araçlara puan verme
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Yorum yapma
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Favorilere ekleme
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Mevcut Planınız
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Kartı */}
        {proProduct && (
          <Card className="rounded-xl shadow-xl border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 m-4">
              <Badge>Popüler</Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">{proProduct.name}</CardTitle>
              <CardDescription>{proProduct.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">
                {(proProduct.prices[0].unit_amount / 100).toLocaleString(
                  "tr-TR",
                  { style: "currency", currency: "TRY" }
                )}
                <span className="text-sm font-normal text-muted-foreground">
                  /ay
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-primary" />
                  Tüm Temel özellikler
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-primary" />
                  Tüm "Pro" Araçlara Erişim
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-primary" />
                  Özel "Pro" Rozeti
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-primary" />
                  AI İçerik Stüdyosu Kullanımı
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-primary" />
                  Topluluğu Destekleme
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {/* DEĞİŞİKLİK: Butonu devre dışı bırakıp "Yakında" mesajı ekliyoruz */}
              <Button className="w-full" size="lg" disabled>
                Yakında...
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

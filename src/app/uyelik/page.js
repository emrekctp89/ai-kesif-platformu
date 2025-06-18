import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCheckoutSession } from "@/app/actions";
import { CheckCircle } from "lucide-react";
import { redirect } from "next/navigation";

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

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Pro Üyeliğe Yükseltin
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Platformun tüm gücünü ortaya çıkarın ve özel avantajlardan yararlanın.
        </p>
      </div>

      <div className="flex justify-center">
        {products.map((product) => (
          <Card
            key={product.id}
            className="w-full max-w-md shadow-lg border-2 border-primary"
          >
            <CardHeader>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-4xl font-bold">
                {(product.prices[0].unit_amount / 100).toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
                <span className="text-sm font-normal text-muted-foreground">
                  /ay
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Tüm "Pro" Araçlara Erişim
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Özel "Pro" Rozeti
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Topluluğu Destekleme
                </li>
              </ul>
              {/* DEĞİŞİKLİK: Formu standart hale getiriyoruz */}
              <form action={createCheckoutSession}>
                <input
                  type="hidden"
                  name="priceId"
                  value={product.prices[0].id}
                />
                <Button type="submit" className="w-full" size="lg">
                  Pro'ya Şimdi Yükselt
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

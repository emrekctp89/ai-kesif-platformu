"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getAiRecommendation } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RecommendationPage() {
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState([]);
  const [isPending, startTransition] = useTransition();

  // Bu fonksiyon, form gönderildiğinde çalışır
  const handleFormSubmit = (formData) => {
    const userPrompt = formData.get("prompt");
    if (!userPrompt) {
      toast.error("Lütfen bir istek girin.");
      return;
    }

    // Yükleme durumunu başlat
    startTransition(async () => {
      const result = await getAiRecommendation(userPrompt);
      if (result.success) {
        setRecommendations(result.data);
      } else {
        toast.error(result.error || "Tavsiye alınırken bir hata oluştu.");
        setRecommendations([]);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Yapay Zeka Destekli Tavsiye Motoru
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Ne yapmak istediğinizi doğal bir dille anlatın, size en uygun AI
          araçlarını biz önerelim.
        </p>
      </div>

      <Card className="mb-12">
        <CardContent className="p-6">
          {/* form'un action'ı artık bu sayfadaki handleFormSubmit'i çağırıyor */}
          <form action={handleFormSubmit} className="space-y-4">
            <div className="grid w-full gap-2">
              <Label htmlFor="prompt-input" className="text-lg font-semibold">
                Nasıl bir araca ihtiyacınız var?
              </Label>
              <Textarea
                id="prompt-input"
                name="prompt"
                placeholder="Örn: 'Sosyal medya gönderilerim için etkileyici görseller oluşturmak istiyorum'..."
                className="min-h-[100px]"
                disabled={isPending}
              />
            </div>
            {/* Buton artık kendi yükleme durumunu yönetiyor */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Düşünüyorum..." : "Tavsiye Al"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sonuçların Gösterileceği Alan */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            İhtiyacınıza Yönelik Tavsiyeler:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((tool) => (
              <Card
                key={tool.slug}
                className="hover:border-primary transition-all"
              >
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/tool/${tool.slug}`}
                      className="hover:underline"
                    >
                      {tool.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{tool.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

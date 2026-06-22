"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";

import { getAiRecommendation } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/utils/analytics";

const examplePrompts = [
  "Sosyal medya için hızlıca görsel ve kısa video üretmek istiyorum.",
  "Kod yazarken hata bulmama ve açıklama üretmeme yardım edecek bir araç arıyorum.",
  "Toplantı kayıtlarını Türkçe metne ve özetlere dönüştürmek istiyorum.",
];

export default function RecommendationPage() {
  const [prompt, setPrompt] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const resultsRef = useRef(null);

  const handleFormSubmit = (formData) => {
    const userPrompt = String(formData.get("prompt") || "").trim();

    if (userPrompt.length < 10) {
      toast.error("İhtiyacınızı en az 10 karakterle anlatın.");
      return;
    }

    trackEvent("recommendation_started", {
      prompt_length: userPrompt.length,
    });

    startTransition(async () => {
      try {
        const result = await getAiRecommendation(userPrompt);

        if (!result.success) {
          toast.error(result.error || "Tavsiye alınırken bir hata oluştu.");
          setRecommendations([]);
          return;
        }

        setSubmittedPrompt(userPrompt);
        setRecommendations(result.data);
        trackEvent("recommendation_completed", {
          result_count: result.data.length,
        });
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } catch {
        toast.error("Sistem hatası oluştu. Lütfen tekrar deneyin.");
        setRecommendations([]);
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-1 py-8 sm:px-4 sm:py-12">
      <header className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          Ücretsiz AI araç eşleştirmesi
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          İhtiyacını anlat, doğru AI aracını bul
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Yapmak istediğin işi doğal bir dille yaz. Platformdaki araçları
          inceleyip sana en uygun üç seçeneği ve nedenlerini sunalım.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="shadow-sm">
          <CardContent className="p-5 sm:p-7">
            <form action={handleFormSubmit} className="space-y-5">
              <div className="grid w-full gap-2">
                <div className="flex items-end justify-between gap-3">
                  <Label
                    htmlFor="prompt-input"
                    className="text-base font-semibold sm:text-lg"
                  >
                    Ne yapmak istiyorsun?
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {prompt.length}/800
                  </span>
                </div>
                <Textarea
                  id="prompt-input"
                  name="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  maxLength={800}
                  minLength={10}
                  required
                  placeholder="Örn. Haftalık ürün videoları hazırlamak istiyorum; tasarım deneyimim yok ve ücretsiz başlayabilmeliyim."
                  className="min-h-[150px] resize-y text-base leading-7"
                  disabled={isPending}
                  aria-describedby="prompt-help"
                />
                <p id="prompt-help" className="text-xs text-muted-foreground">
                  Kullanım amacı, deneyim seviyesi, bütçe veya platform gibi
                  ayrıntılar daha isabetli sonuç verir.
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bir örnekle başla
                </p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      disabled={isPending}
                      className="min-h-10 rounded-full border bg-background px-3 py-2 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      Örnek {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="min-h-12 w-full"
                disabled={isPending || prompt.trim().length < 10}
              >
                {isPending ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="mr-2 h-5 w-5 animate-spin"
                    />
                    Araçlar inceleniyor...
                  </>
                ) : (
                  <>
                    <Search aria-hidden="true" className="mr-2 h-5 w-5" />
                    Bana uygun araçları bul
                  </>
                )}
              </Button>
              <p
                className="text-center text-xs text-muted-foreground"
                aria-live="polite"
              >
                {isPending
                  ? "Platformdaki araçlar ihtiyacınıza göre karşılaştırılıyor."
                  : "Sonuçlar genellikle birkaç saniye içinde hazırlanır."}
              </p>
            </form>
          </CardContent>
        </Card>

        <aside className="rounded-xl border bg-muted/30 p-5">
          <h2 className="font-bold">Nasıl çalışır?</h2>
          <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
            {[
              "İhtiyacını ve önemli koşulları yaz.",
              "AI Keşif uygun araçları karşılaştırsın.",
              "Önerilerin detaylarını inceleyip karar ver.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="leading-6">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
            Tavsiyeler karar desteği sağlar. Fiyat ve özellikleri aracın resmî
            sitesinden doğrulamanı öneririz.
          </p>
        </aside>
      </div>

      <section
        ref={resultsRef}
        aria-labelledby="recommendation-results-heading"
        aria-live="polite"
        className="scroll-mt-24"
      >
        {recommendations.length > 0 && (
          <div className="mt-12">
            <div className="mb-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Eşleştirme tamamlandı
              </p>
              <h2
                id="recommendation-results-heading"
                className="mt-2 text-2xl font-bold"
              >
                Sana uygun araçlar
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                “{submittedPrompt}” ihtiyacına göre sıralandı.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {recommendations.map((tool, index) => (
                <Card
                  key={tool.slug}
                  className="flex h-full flex-col transition-colors hover:border-primary"
                >
                  <CardHeader>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {index + 1}. öneri
                    </p>
                    <CardTitle className="text-xl">{tool.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {tool.reason}
                    </p>
                    <Button asChild className="mt-6 w-full">
                      <Link
                        href={`/tool/${tool.slug}`}
                        prefetch={false}
                        onClick={() =>
                          trackEvent("recommendation_result_click", {
                            tool_slug: tool.slug,
                            result_position: index + 1,
                          })
                        }
                      >
                        Detayları incele
                        <ArrowRight
                          aria-hidden="true"
                          className="ml-2 h-4 w-4"
                        />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRecommendations([]);
                  setSubmittedPrompt("");
                  setPrompt("");
                  document.getElementById("prompt-input")?.focus();
                }}
              >
                Yeni bir ihtiyaç yaz
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

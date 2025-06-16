import { createClient } from '@/utils/supabase/server';
import { getAiRecommendation } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// Bu bir Server Component'tir ve sayfa ilk yüklendiğinde çalışır.
export default async function RecommendationPage({ searchParams }) {
  // DÜZELTME: searchParams.get('prompt') yerine doğrudan searchParams.prompt
  // veya daha güvenli olan searchParams['prompt'] kullanılır.
  const userPrompt = searchParams['prompt'] || '';
  let recommendations = [];
  let isLoading = false; // Bu, form gönderildiğinde yeniden render için kullanılır.

  // Eğer kullanıcı bir prompt gönderdiyse, yapay zekadan tavsiye al
  if (userPrompt) {
    isLoading = true; // Yükleme durumunu başlat
    try {
      const result = await getAiRecommendation(userPrompt);
      if (result.success) {
        recommendations = result.data;
      } else {
        console.error(result.error);
      }
    } finally {
      isLoading = false; // Yükleme durumunu bitir
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Yapay Zeka Destekli Tavsiye Motoru
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Ne yapmak istediğinizi doğal bir dille anlatın, size en uygun AI araçlarını biz önerelim.
        </p>
      </div>

      <Card className="mb-12">
        <CardContent className="p-6">
          <form className="space-y-4">
            <div className="grid w-full gap-2">
              <Label htmlFor="prompt-input" className="text-lg font-semibold">
                Nasıl bir araca ihtiyacınız var?
              </Label>
              <Textarea
                id="prompt-input"
                name="prompt"
                placeholder="Örn: 'Sosyal medya gönderilerim için etkileyici görseller oluşturmak istiyorum' veya 'bir video sunumunu metne çevirmem lazım'..."
                className="min-h-[100px]"
                defaultValue={userPrompt}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Düşünüyorum...' : 'Tavsiye Al'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sonuçların Gösterileceği Alan */}
      {userPrompt && !isLoading && (
        <div>
          <h2 className="text-2xl font-bold mb-4">İhtiyacınıza Yönelik Tavsiyeler:</h2>
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((tool) => (
                <Card key={tool.slug} className="hover:border-primary transition-all">
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/tool/${tool.slug}`} className="hover:underline">
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
          ) : (
            <p className="text-center text-muted-foreground">Bu isteğiniz için uygun bir araç bulunamadı veya bir hata oluştu.</p>
          )}
        </div>
      )}
    </div>
  );
}

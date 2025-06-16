import { getSimilarTools } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
// Carousel bileşenlerini import ediyoruz
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Bu bir asenkron Server Component
export async function SimilarTools({ currentTool }) {
  // Server action'ı çağırıp sonucu bekliyoruz
  const result = await getSimilarTools(currentTool);

  // Eğer başarılı bir sonuç yoksa veya tavsiye listesi boşsa, bileşeni hiç gösterme
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  const similarTools = result.data;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Lightbulb className="w-7 h-7 text-primary" />
        Bunları da Beğenebilirsiniz
      </h2>
      {/* DEĞİŞİKLİK: Grid yerine Carousel kullanıyoruz */}
      <Carousel
        opts={{
          align: "start",
          // Eğer 3'ten az araç varsa loop'u kapat, daha iyi görünür
          loop: similarTools.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent>
          {similarTools.map((tool) => (
            <CarouselItem key={tool.slug} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1 h-full">
                <Card className="h-full hover:border-primary transition-all">
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
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Neden Benzer?
                      </span>{" "}
                      {tool.reason}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}

import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollHint } from "@/components/ScrollHint";
import { SimilarTools } from "@/components/SimilarTools";
import { BookOpen } from "lucide-react";
import BackToHome from "@/components/BackToHome";

const platformIcons = {
  Web: "🌐",
  iOS: "🍎",
  Android: "🤖",
  Windows: "🖥️",
  macOS: "🖥️",
  Linux: "🐧",
  "Chrome Uzantısı": "🛒",
};

async function getToolData(slug) {
  const supabase = createClient();

  const { data: tool, error } = await supabase
    .from("tools_with_ratings")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !tool) notFound();

  // Akademik makaleler ve prompt sekmeleri artık kullanılmayacak
  return { tool };
}

export default async function ToolDetailPage({ params }) {
  const { slug } = params;
  const { tool } = await getToolData(slug);

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 space-y-16">
      {/* Araç Detayları */}
      <BackToHome />
      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-16">
        {/* Araç detayları, rehberler, benzer araçlar */}
      </div>
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-1 rounded-full w-fit">
            {tool.category_name}
          </span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            ⭐ {tool.average_rating.toFixed(1)} ({tool.total_ratings} oy)
          </div>
          {tool.platforms && tool.platforms.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              {tool.platforms.map((p) => (
                <span key={p} title={p}>{platformIcons[p] || p}</span>
              ))}
            </div>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">{tool.name}</h1>
        <p className="text-lg text-muted-foreground">{tool.description}</p>

       <a
  href={tool.link}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-block mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
>
  Web Sitesini Ziyaret Et
</a>

      </section>

      <ScrollHint />

      {/* Rehberler */}
      {tool.relatedGuides?.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <BookOpen className="w-6 h-6" /> Bu Araç ile İlgili Rehberler
          </h2>
          <div className="space-y-4">
            {tool.relatedGuides.map((guide) => (
              <Link key={guide.slug} href={`/blog/${guide.slug}`} className="group block">
                <Card className="hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary">{guide.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2 text-sm">{guide.description}</p>
                  </CardContent>
                </Card>
              </Link>
      
            ))}
          </div>
        </section>
      )}

      {/* Benzer Araçlar */}
      <section>
        <SimilarTools currentTool={tool} />
      </section>
    </div>
  );
}

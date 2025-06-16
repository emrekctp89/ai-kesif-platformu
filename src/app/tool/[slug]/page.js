import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

// shadcn/ui bileşenleri
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Kendi oluşturduğumuz bileşenler
import StarRating from "@/components/StarRating";
import FavoriteButton from "@/components/FavoriteButton";
import CommentSection from "@/components/CommentSection";
import { ShareButtons } from "@/components/ShareButtons";
import { SimilarTools } from "@/components/SimilarTools";
import { ScrollHint } from "@/components/ScrollHint";
import PromptSection from "@/components/PromptSection";
//import { CommentsUI as PromptSection } from "@/components/PromptSection";

// İkonlar
import {
  Globe,
  Apple,
  Bot,
  Monitor,
  Pen,
  ShoppingCart,
  Star,
} from "lucide-react";

const platformIcons = {
  Web: <Globe className="w-5 h-5" />,
  iOS: <Apple className="w-5 h-5" />,
  Android: <Bot className="w-5 h-5" />,
  Windows: <Monitor className="w-5 h-5" />,
  macOS: <Monitor className="w-5 h-5" />,
  Linux: <Pen className="w-5 h-5" />,
  "Chrome Uzantısı": <ShoppingCart className="w-5 h-5" />,
};

async function getToolData(slug) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  const { data: tool, error } = await supabase
    .from("tools_with_ratings")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !tool) notFound();
  const { data: favoriteRecord } = userId
    ? await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("tool_id", tool.id)
        .single()
    : { data: null };
  const isFavorited = !!favoriteRecord;
  const { data: ratingRecord } = userId
    ? await supabase
        .from("ratings")
        .select("rating")
        .eq("user_id", userId)
        .eq("tool_id", tool.id)
        .single()
    : { data: null };
  const usersRating = ratingRecord?.rating || 0;
  return { tool, usersRating, isFavorited, user };
}

export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data: tool } = await supabase
    .from("tools")
    .select("name, description")
    .eq("slug", params.slug)
    .single();
  if (!tool) return { title: "Araç Bulunamadı" };
  return {
    title: `${tool.name} | AI Keşif Platformu`,
    description: tool.description,
  };
}

export default async function ToolDetailPage({ params }) {
  const { tool, usersRating, isFavorited, user } = await getToolData(
    params.slug
  );
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/tool/${tool.slug}`;
  const shareTitle = `Bu harika AI aracını keşfet: ${tool.name}`;

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 space-y-16">
      {/* 1. Bölüm: Ana Araç Detayları */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-1 rounded-full w-fit">
            {tool.category_name}
          </span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-lg text-foreground">
              {tool.average_rating.toFixed(1)}
            </span>
            <span>({tool.total_ratings} oy)</span>
          </div>
          {tool.pricing_model && (
            <Badge variant="default">{tool.pricing_model}</Badge>
          )}
          {tool.platforms && tool.platforms.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              {tool.platforms.map((p) => (
                <span key={p} title={p}>
                  {platformIcons[p] || null}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between items-start">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground pr-4">
            {tool.name}
          </h1>
          {user && (
            <FavoriteButton
              toolId={tool.id}
              toolSlug={tool.slug}
              isInitiallyFavorited={isFavorited}
            />
          )}
        </div>
        <p className="text-lg text-muted-foreground">{tool.description}</p>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t border-border">
          <StarRating
            toolId={tool.id}
            toolSlug={tool.slug}
            currentUsersRating={usersRating}
          />
          <Button asChild>
            <a
              href={tool.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              Web Sitesini Ziyaret Et
            </a>
          </Button>
        </div>
      </section>

      <ScrollHint />

      {/* 2. Bölüm: Paylaşım */}
      <section>
        <Card className="rounded-xl shadow-xl">
          <CardHeader>
            <CardTitle>Bu Aracı Paylaş</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareButtons url={shareUrl} title={shareTitle} />
          </CardContent>
        </Card>
      </section>

      {/* 3. Bölüm: Yorumlar */}
      <section>
        <Card className="rounded-xl shadow-xl">
          <CardContent className="p-8 md:p-12">
            <CommentSection toolId={tool.id} toolSlug={tool.slug} />
          </CardContent>
        </Card>
      </section>

      {/* 4. Bölüm: Prompt Kütüphanesi */}
      <section>
        <PromptSection toolId={tool.id} toolSlug={tool.slug} />
      </section>

      {/* 5. Bölüm: Benzer Araçlar */}
      <section>
        <SimilarTools currentTool={tool} />
      </section>
    </div>
  );
}

import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/StarRating";
import FavoriteButton from "@/components/FavoriteButton";
import CommentSection from "@/components/CommentSection";
import { ShareButtons } from "@/components/ShareButtons";
import { SimilarTools } from "@/components/SimilarTools";
import { ScrollHint } from "@/components/ScrollHint";
import PromptSection from "@/components/PromptSection";
import { ShareButton } from "@/components/ShareButton";
import {
  Globe,
  Apple,
  Bot,
  Monitor,
  Pen,
  ShoppingCart,
  Star,
  Crown,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

const platformIcons = {
  Web: <Globe className="w-5 h-5" />,
  iOS: <Apple className="w-5 h-5" />,
  Android: <Bot className="w-5 h-5" />,
  Windows: <Monitor className="w-5 h-5" />,
  macOS: <Monitor className="w-5 h-5" />,
  Linux: <Pen className="w-5 h-5" />,
  "Chrome Uzantısı": <ShoppingCart className="w-5 h-5" />,
};

// Seviyelere göre özel stiller ve ikonlar
const tierStyles = {
  Pro: {
    badge: "bg-purple-600 text-white hover:bg-purple-700",
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: "bg-amber-500 text-white hover:bg-amber-600",
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
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
  // DEĞİŞİKLİK: Kullanıcının abonelik durumunu çekiyoruz
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("stripe_price_id")
        .eq("id", user.id)
        .single()
    : { data: null };
  const isProUser =
    !!profile?.stripe_price_id ||
    (user && user.email === process.env.ADMIN_EMAIL);

  // YENİ: Eğer araç "Pro" ise ve kullanıcı Pro değilse, üyelik sayfasına yönlendir
  // Bu if bloğunu kaldırın veya yorum satırı yapın:
  // if (tool.tier === 'Pro' && !isProUser) {
  //   redirect('/uyelik');

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

// YENİ: Belirli bir araçla ilişkili rehberleri çeken fonksiyon
async function getRelatedGuides(toolId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("post_tools")
    .select(
      `
            posts (title, slug, description)
        `
    )
    .eq("tool_id", toolId)
    .eq("posts.status", "Yayınlandı")
    .eq("posts.type", "Rehber");

  if (error) {
    console.error("İlgili rehberler çekilirken hata:", error);
    return [];
  }
  return data.map((item) => item.posts).filter(Boolean);
}

export default async function ToolDetailPage({ params }) {
  const { tool, usersRating, isFavorited, user } = await getToolData(
    params.slug
  );
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/tool/${tool.slug}`;
  const shareTitle = `Bu harika AI aracını keşfet: ${tool.name}`;
  // Paylaşım için özel içerik objesini hazırlıyoruz
  const sharedContent = {
    type: "tool",
    id: tool.id,
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    // Görseli olan bir alan varsa o da eklenebilir
  };
  const relatedGuides = await getRelatedGuides(tool.id);

  // DÜZELTME: Eksik olan değişkeni burada tanımlıyoruz.
  const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 space-y-16">
      {/* 1. Bölüm: Ana Araç Detayları */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          {isPremium && (
            <Badge className={cn("text-sm", tierStyles[tool.tier]?.badge)}>
              {tierStyles[tool.tier]?.icon}
              {tool.tier}
            </Badge>
          )}
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
          <CardContent className="flex items-center justify-between">
            {/* Harici Sosyal Medya Butonları */}
            <ShareButtons url={shareUrl} title={shareTitle} />

            {/* YENİ: Platform İçi Mesajla Paylaşma Butonu */}
            {user && <ShareButton content={sharedContent} />}
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

      {/* YENİ: İlgili Rehberler Bölümü */}
      {relatedGuides.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <BookOpen className="w-6 h-6" />
            Bu Araç ile İlgili Rehberler
          </h2>
          <div className="space-y-4">
            {relatedGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/blog/${guide.slug}`}
                className="group block"
              >
                <Card className="hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary">
                      {guide.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {guide.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 5. Bölüm: Benzer Araçlar */}
      <section>
        <SimilarTools currentTool={tool} />
      </section>
    </div>
  );
}

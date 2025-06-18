import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/FavoriteButton";
import { AdvancedPagination } from "@/components/AdvancedPagination";
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

const ITEMS_PER_PAGE = 12;

const platformIcons = {
  Web: <Globe className="w-4 h-4" />,
  iOS: <Apple className="w-4 h-4" />,
  Android: <Bot className="w-4 h-4" />,
  Windows: <Monitor className="w-4 h-4" />,
  macOS: <Monitor className="w-4 h-4" />,
  Linux: <Pen className="w-4 h-4" />,
  "Chrome Uzantısı": <ShoppingCart className="w-4 h-4" />,
};

// Seviyelere göre özel stiller ve ikonlar
const tierStyles = {
  Pro: {
    badge: "bg-purple-600 text-white hover:bg-purple-700 border-purple-700",
    card: "border-purple-500/50 shadow-lg shadow-purple-500/10",
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: "bg-amber-500 text-white hover:bg-amber-600 border-amber-600",
    card: "border-amber-500/50 shadow-lg shadow-amber-500/10",
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
};

async function getToolsData(searchParams, user, favoriteToolIds) {
  const supabase = createClient();

  const categorySlug = searchParams["category"];
  const searchText = searchParams["search"];
  const sortBy = searchParams["sort"] || "newest";
  const currentPage = parseInt(searchParams["page"] || "1", 10);
  const selectedTags = searchParams["tags"]
    ? searchParams["tags"].split(",").map(Number)
    : [];
  const pricingModel = searchParams["pricing"];
  const selectedPlatforms = searchParams["platforms"]
    ? searchParams["platforms"].split(",")
    : [];
  const selectedTier = searchParams["tier"]; // YENİ: Seviye filtresini alıyoruz

  // DEĞİŞİKLİK: Kullanıcının abonelik durumunu da çekiyoruz
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("stripe_price_id")
        .eq("id", user.id)
        .single()
    : { data: null };
  const isProUser = !!profile?.stripe_price_id;

  const { data: favorites } = user
    ? await supabase.from("favorites").select("tool_id").eq("user_id", user.id)
    : { data: [] };
  const favoriteToolIds = new Set(favorites?.map((f) => f.tool_id) || []);

  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from("tools_with_ratings")
    .select("*", { count: "exact" })
    .eq("is_approved", true);

  if (categorySlug) query = query.eq("category_slug", categorySlug);
  if (searchText)
    query = query.or(
      `name.ilike.%${searchText}%,description.ilike.%${searchText}%`
    );

  if (selectedTags.length > 0) {
    const tagsToFilter = JSON.stringify(selectedTags.map((id) => ({ id })));
    query = query.contains("tags", tagsToFilter);
  }

  if (pricingModel) query = query.eq("pricing_model", pricingModel);
  if (selectedPlatforms.length > 0)
    query = query.contains("platforms", selectedPlatforms);

  // YENİ: Seviyeye göre filtrelemeyi sorguya ekliyoruz
  if (selectedTier) {
    query = query.eq("tier", selectedTier);
  }

  // DEĞİŞİKLİK: Eğer kullanıcı Pro değilse, 'Pro' seviyesindeki araçları hariç tut
  if (!isProUser) {
    query = query.neq("tier", "Pro");
  }

  switch (sortBy) {
    case "rating":
      query = query.order("average_rating", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "popularity":
      query = query.order("total_ratings", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(from, to);
  const { data: tools, error, count: totalCount } = await query;

  if (error) {
    console.error("Araçları çekerken hata:", error.message);
    return { tools: [], currentPage, totalPages: 0 };
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return { tools, currentPage, totalPages };
}

export async function ToolsList({ searchParams, user, favoriteToolIds }) {
  // isProUser bilgisi artık getToolsData'dan gelecek
  const { tools, currentPage, totalPages, isProUser } = await getToolsData(
    searchParams,
    user
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.length > 0 ? (
          tools.map((tool) => {
            const isFavorited = favoriteToolIds.has(tool.id);
            const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";

            return (
              <div
                key={tool.id}
                className={cn(
                  "bg-card border rounded-xl p-6 shadow-lg flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                  isPremium && tierStyles[tool.tier]?.card
                )}
              >
                {user && (
                  <div className="absolute top-4 right-4 z-10">
                    <FavoriteButton
                      toolId={tool.id}
                      toolSlug={tool.slug}
                      isInitiallyFavorited={isFavorited}
                    />
                  </div>
                )}
                <div className="flex-grow">
                  {isPremium && (
                    <Badge
                      className={cn(
                        "mb-2 flex w-fit items-center",
                        tierStyles[tool.tier]?.badge
                      )}
                    >
                      {tierStyles[tool.tier]?.icon}
                      {tool.tier}
                    </Badge>
                  )}
                  <Link href={`/tool/${tool.slug}`} className="group">
                    <h2 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                      {tool.name}
                    </h2>
                  </Link>
                  <Link
                    href={`/?category=${tool.category_slug}`}
                    className="inline-block mt-2"
                  >
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit block hover:bg-primary hover:text-primary-foreground transition-colors">
                      {tool.category_name}
                    </span>
                  </Link>
                  {tool.tags && tool.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 my-3">
                      {tool.tags.map((tag) => (
                        <Link key={tag.id} href={`/?tags=${tag.id}`}>
                          <Badge
                            variant="outline"
                            className="hover:bg-accent hover:border-primary transition-colors"
                          >
                            {tag.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {tool.description}
                  </p>
                </div>
                <div className="mt-auto pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-bold text-foreground">
                        {tool.average_rating.toFixed(1)}
                      </span>
                      <span>({tool.total_ratings} oy)</span>
                    </div>
                    {tool.pricing_model && (
                      <Badge variant="default">{tool.pricing_model}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {tool.platforms?.map((p, index) => (
                        <span key={`${tool.id}-${p}-${index}`} title={p}>
                          {platformIcons[p] || null}
                        </span>
                      ))}
                    </div>
                    <Button asChild size="sm">
                      <a
                        href={tool.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ziyaret Et
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="col-span-full text-center text-muted-foreground text-lg mt-8">
            Aradığınız kriterlere uygun araç bulunamadı.
          </p>
        )}
      </div>
      <div className="mt-12">
        <AdvancedPagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </>
  );
}

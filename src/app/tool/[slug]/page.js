import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Layers3,
  MonitorSmartphone,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/ShareButtons";
import { SimilarTools } from "@/components/SimilarTools";
import { TrackedExternalLink } from "@/components/TrackedExternalLink";

export const revalidate = 3600;

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikeşif.com"
).origin;

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function getToolData(slug) {
  const supabase = createPublicClient();
  const { data: tool, error } = await supabase
    .from("tools")
    .select(
      "id, name, description, link, category_id, slug, pricing_model, platforms, tier, created_at, updated_at, technical_details"
    )
    .eq("slug", slug)
    .eq("is_approved", true)
    .maybeSingle();

  if (error || !tool) return null;

  const { data: category } = tool.category_id
    ? await supabase
        .from("categories")
        .select("name, slug")
        .eq("id", tool.category_id)
        .maybeSingle()
    : { data: null };

  return {
    ...tool,
    category_name: category?.name || "Yapay Zeka Aracı",
    category_slug: category?.slug,
  };
}

function getHostname(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "Harici web sitesi";
  }
}

function formatDate(value) {
  if (!value) return null;

  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function createMetaDescription(description) {
  if (!description || description.length <= 160) return description;
  return `${description.slice(0, 157).trimEnd()}...`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tool = await getToolData(slug);

  if (!tool) {
    return {
      title: "Araç Bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const title = `${tool.name} Nedir? Özellikleri ve Kullanımı`;
  const description = createMetaDescription(tool.description);

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `/tool/${tool.slug}`,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${tool.name} - AI Keşif`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function ToolDetailPage({ params }) {
  const { slug } = await params;
  const tool = await getToolData(slug);

  if (!tool) notFound();

  const shareUrl = `${siteUrl}/tool/${tool.slug}`;
  const hostname = getHostname(tool.link);
  const addedDate = formatDate(tool.created_at);
  const updatedDate = formatDate(tool.updated_at);
  const platforms =
    Array.isArray(tool.platforms) && tool.platforms.length > 0
      ? tool.platforms
      : ["Web"];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${shareUrl}#software`,
        name: tool.name,
        description: tool.description,
        url: shareUrl,
        sameAs: tool.link,
        applicationCategory: tool.category_name,
        operatingSystem: platforms.join(", "),
        datePublished: tool.created_at || undefined,
        dateModified: tool.updated_at || tool.created_at || undefined,
        inLanguage: "tr-TR",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${shareUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Ana Sayfa",
            item: siteUrl,
          },
          ...(tool.category_slug
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: tool.category_name,
                  item: `${siteUrl}/kategori/${tool.category_slug}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: tool.category_slug ? 3 : 2,
            name: tool.name,
            item: shareUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-10">
        <Link
          href={
            tool.category_slug ? `/kategori/${tool.category_slug}` : "/"
          }
          className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-6 sm:min-h-11"
        >
          <ArrowLeft className="h-4 w-4" />
          {tool.category_slug
            ? `${tool.category_name} araçlarına dön`
            : "Tüm araçlara dön"}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <section className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {tool.category_slug ? (
                  <Link href={`/kategori/${tool.category_slug}`}>
                    <Badge variant="secondary">{tool.category_name}</Badge>
                  </Link>
                ) : (
                  <Badge variant="secondary">{tool.category_name}</Badge>
                )}
                {tool.tier && <Badge variant="outline">{tool.tier}</Badge>}
                {tool.pricing_model && (
                  <Badge variant="outline">{tool.pricing_model}</Badge>
                )}
                {platforms.slice(0, 2).map((platform) => (
                  <Badge key={platform} variant="outline">
                    {platform}
                  </Badge>
                ))}
              </div>

              <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                {tool.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:mt-5 sm:text-lg sm:leading-8">
                {tool.description}
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
                <Button asChild size="lg" className="min-h-12 sm:min-w-56">
                  <TrackedExternalLink
                    href={tool.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    eventParameters={{
                      tool_slug: tool.slug,
                      category: tool.category_slug,
                      placement: "hero",
                    }}
                  >
                    Resmî Siteyi İncele
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </TrackedExternalLink>
                </Button>
                <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {hostname} adresi yeni sekmede açılır.
                </p>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <TrustNote text="Fiyat ve özellikler sağlayıcıda doğrulanmalı" />
                <TrustNote text="Benzer araçlarla karşılaştırarak karar verebilirsin" />
              </div>
            </section>

            <section aria-labelledby="tool-overview-heading">
              <h2
                id="tool-overview-heading"
                className="mb-4 text-2xl font-bold"
              >
                Kısa Bakış
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <InfoCard
                  icon={Layers3}
                  label="Kategori"
                  value={tool.category_name}
                />
                <InfoCard
                  icon={WalletCards}
                  label="Fiyatlandırma"
                  value={tool.pricing_model || "Bilgi belirtilmemiş"}
                />
                <InfoCard
                  icon={MonitorSmartphone}
                  label="Platformlar"
                  value={platforms.join(", ")}
                />
                <InfoCard
                  icon={CalendarDays}
                  label={updatedDate ? "Son güncelleme" : "Platforma eklendi"}
                  value={updatedDate || addedDate || "Yakın zamanda"}
                />
              </div>
            </section>

            {tool.technical_details && (
              <section aria-labelledby="technical-details-heading">
                <h2
                  id="technical-details-heading"
                  className="mb-4 text-2xl font-bold"
                >
                  Teknik Bilgiler
                </h2>
                <Card>
                  <CardContent className="p-5 text-sm leading-7 text-muted-foreground sm:p-6">
                    {tool.technical_details}
                  </CardContent>
                </Card>
              </section>
            )}

            <section className="border-t pt-8">
              <SimilarTools currentTool={tool} />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-5">
                <div>
                  <p className="text-sm font-semibold">Karar vermeye hazır mısın?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Resmî siteyi açarak güncel özellikleri ve fiyatları
                    inceleyebilirsin.
                  </p>
                </div>
                <Button asChild className="min-h-11 w-full">
                  <TrackedExternalLink
                    href={tool.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    eventParameters={{
                      tool_slug: tool.slug,
                      category: tool.category_slug,
                      placement: "sidebar",
                    }}
                  >
                    {tool.name} Sitesine Git
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </TrackedExternalLink>
                </Button>
                <div className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold text-foreground">Hızlı karar özeti</p>
                  <p className="mt-1">
                    {tool.pricing_model || "Fiyat bilgisi belirtilmemiş"} · {platforms.slice(0, 2).join(", ")}
                    {platforms.length > 2 ? ` +${platforms.length - 2}` : ""}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <ShareButtons
                    url={shareUrl}
                    title={`${tool.name} aracını AI Keşif'te incele`}
                  />
                </div>
              </CardContent>
            </Card>

            <p className="px-2 text-xs leading-5 text-muted-foreground">
              AI Keşif, araçların resmî sağlayıcısı değildir. Özellikler ve
              fiyatlar zaman içinde değişebilir.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TrustNote({ text }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-background/70 px-3 py-2">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
      <span>{text}</span>
    </div>
  );
}

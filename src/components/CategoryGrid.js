import Link from 'next/link';
import { getCategoryConfig } from '@/lib/categoryConfig';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

/**
 * @param {{ categories: Array<{ name: string, slug: string }>, limit?: number | null, showAllLink?: boolean }} props
 * limit: anasayfada gösterilecek max kart (null = hepsi)
 */
export function CategoryGrid({ categories, limit = 36, showAllLink = true }) {
  if (!categories || categories.length === 0) return null;

  const visible = typeof limit === 'number' && limit > 0 ? categories.slice(0, limit) : categories;
  const hasMore = typeof limit === 'number' && categories.length > limit;

  return (
    <section className="mb-16" aria-labelledby="categories-heading">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 id="categories-heading" className="text-2xl font-bold tracking-tight text-foreground">
            Kategorileri Keşfet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length} kategori · ihtiyacına uygun araç grubunu seç
          </p>
        </div>
        {showAllLink ? (
          <Link
            href="/kategori"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Tümünü gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((category) => {
          const config = getCategoryConfig(category.slug);
          const Icon = config.icon;

          return (
            <Link
              key={category.slug}
              href={`/kategori/${category.slug}`}
              className="group block h-full"
              prefetch={false}
            >
              <Card className="glass-panel relative h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />
                <CardContent className="relative z-10 flex flex-col items-start gap-4 p-5">
                  <div
                    className={`rounded-2xl border bg-background p-3 shadow-sm transition-transform duration-300 group-hover:scale-110 ${config.border}`}
                  >
                    <Icon className={`h-6 w-6 ${config.text}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                      {category.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <Link
            href="/kategori"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-950/5 px-5 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-950/10 dark:text-indigo-200"
          >
            +{categories.length - limit} kategori daha
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

import Link from 'next/link';
import { getCategoryConfig } from '@/lib/categoryConfig';
import { Card, CardContent } from '@/components/ui/card';

export function CategoryGrid({ categories }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="mb-16" aria-labelledby="categories-heading">
      <div className="flex items-center justify-between mb-6">
        <h2 id="categories-heading" className="text-2xl font-bold tracking-tight text-foreground">
          Kategorileri Keşfet
        </h2>
        <Link href="/kategori" className="text-sm font-medium text-primary hover:underline">
          Tümünü Gör
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.slice(0, 12).map((category) => {
          const config = getCategoryConfig(category.slug);
          const Icon = config.icon;

          return (
            <Link
              key={category.slug}
              href={`/kategori/${category.slug}`}
              className="group block h-full"
            >
              <Card className="h-full relative overflow-hidden border-border/50 glass-panel hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                {/* Arkaplan degrade efekti */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                <CardContent className="relative z-10 p-5 flex flex-col items-start gap-4">
                  <div
                    className={`p-3 rounded-2xl bg-background border ${config.border} shadow-sm group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`w-6 h-6 ${config.text}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {config.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

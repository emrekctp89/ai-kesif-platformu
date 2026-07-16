import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { generatePageMetadata } from '@/utils/seo';
import { Mail, ArrowRight, Calendar } from 'lucide-react';

async function getPublishedNewsletters() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletters')
    .select('title, slug, description, subject, sent_at')
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Bülten arşivi çekilirken hata:', error);
    return [];
  }

  return data || [];
}

export async function generateMetadata() {
  return generatePageMetadata({
    title: 'Haftalık Bülten',
    description:
      'AI Keşif Platformu haftalık bültenine abone olun. Geçmiş bültenleri arşivden okuyun: trend AI araçları, promptlar ve topluluk öne çıkanları.',
    path: '/bulten',
  });
}

export const revalidate = 3600;

export default async function BultenPage() {
  const newsletters = await getPublishedNewsletters();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <section className="relative mb-16 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background px-6 py-14 text-center sm:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--primary)/0.12),transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Haftalık AI Bülteni
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Keşfi e-postanıza taşıyın
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Her hafta trend AI araçları, seçilmiş promptlar ve topluluktan öne çıkanlar. Spam yok —
            sadece değer.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <NewsletterSignup />
      </section>

      <section aria-labelledby="bulten-arsiv-heading">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="bulten-arsiv-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Bülten Arşivi
            </h2>
            <p className="mt-2 text-muted-foreground">
              Daha önce gönderilen haftalık bültenleri tarayıcıda okuyun.
            </p>
          </div>
          {newsletters.length > 0 && (
            <Badge variant="secondary" className="w-fit">
              {newsletters.length} bülten
            </Badge>
          )}
        </div>

        {newsletters.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {newsletters.map((item) => (
              <Link key={item.slug} href={`/bulten/${item.slug}`} className="group">
                <Card className="h-full overflow-hidden transition-all hover:border-primary hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <time dateTime={item.sent_at}>
                        {new Date(item.sent_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                    </div>
                    <CardTitle className="text-xl transition-colors group-hover:text-primary">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-3 text-muted-foreground">
                      {item.description || item.subject || 'Haftalık AI bülteni özeti.'}
                    </p>
                    <span className="inline-flex items-center text-sm font-medium text-primary">
                      Bülteni oku
                      <ArrowRight
                        className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Mail
                className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60"
                aria-hidden="true"
              />
              <p className="text-muted-foreground">
                Henüz arşivlenmiş bir bülten yok. Abone olun; ilk gönderiden sonra burada
                listelenecek.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

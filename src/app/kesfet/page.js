import { createClient } from "@/utils/supabase/server";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Rss, Bot, Library, Map, Users, Sparkles, collections, learningPaths } from 'lucide-react';

// Veritabanındaki RPC fonksiyonlarını çağıran ana fonksiyon
async function getDiscoverData() {
    const supabase = createClient();
    // DEĞİŞİKLİK: Artık 3 farklı RPC'yi tek seferde çağırıyoruz
    const [
        { data: mainData, error: mainError },
        { data: collections, error: collectionsError },
        { data: learningPaths, error: learningPathsError }
    ] = await Promise.all([
        supabase.rpc('get_discover_page_data'),
        supabase.rpc('get_popular_collections'),
        supabase.rpc('get_learning_paths')
    ]);

    if (mainError || collectionsError || learningPathsError) {
        console.error("Keşfet sayfası verisi çekilirken hata:", mainError || collectionsError || learningPathsError);
        return null;
    }
    
    return { ...mainData, collections, learningPaths };
}


export const metadata = {
  title: "Keşfet | AI Keşif Platformu",
  description:
    "Yapay zeka dünyasındaki en son araçları, popüler eserleri, blog yazılarını ve daha fazlasını keşfedin.",
};

export default async function DiscoverPage() {
    const discoverData = await getDiscoverData();

    if (!discoverData) {
        return <p className="text-center text-muted-foreground">İçerik yüklenirken bir sorun oluştu.</p>;
    }
    
    const { tool_of_the_day, latest_tools, latest_showcase, latest_posts, top_users, collections, learningPaths } = discoverData;

    return (
        <div className="container mx-auto py-12 px-4 space-y-16">
            {tool_of_the_day && (
                <section>
                    <Card className="w-full bg-gradient-to-br from-primary/10 via-background to-background border-2 border-primary/50 shadow-lg">
                        <CardContent className="p-8 grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-primary font-bold text-lg"><Zap className="w-6 h-6" /><span>GÜNÜN ARACI</span></div>
                                <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{tool_of_the_day.name}</h2>
                                <p className="text-muted-foreground text-lg">{tool_of_the_day.description}</p>
                                <Button asChild size="lg"><Link href={`/tool/${tool_of_the_day.slug}`}>İncele & Keşfet</Link></Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}
      
      {/* YENİ: Popüler Koleksiyonlar Bölümü */}
            {collections?.length > 0 && (
                <section>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
                        <Library className="w-8 h-8 text-blue-500" />
                        Popüler Koleksiyonlar
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {collections.map((collection) => (
                             <Link key={collection.slug} href={`/koleksiyonlar/${collection.slug}`} className="group">
                                <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-blue-500">
                                    <CardHeader>
                                        <CardTitle className="group-hover:text-blue-500">{collection.title}</CardTitle>
                                        <CardDescription className="line-clamp-2">{collection.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">Oluşturan: {collection.author_username}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* YENİ: Öğrenme Yolları Bölümü */}
            {learningPaths?.length > 0 && (
                <section>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
                        <Map className="w-8 h-8 text-green-500" />
                        Öğrenme Yolları
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {learningPaths.map((path) => (
                             <Link key={path.slug} href={`/koleksiyonlar/${path.slug}`} className="group">
                                <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-green-500">
                                    <CardHeader>
                                        <CardTitle className="group-hover:text-green-500">{path.title}</CardTitle>
                                        <CardDescription className="line-clamp-2">{path.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">Oluşturan: {path.author_username}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-pink-500" />
            Son Eserler
          </h2>
          {latest_showcase?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {latest_showcase.map((item) => (
                <Link
                  key={item.id}
                  href={`/eserler?eserId=${item.id}`}
                  className="group"
                >
                  <div className="aspect-square relative rounded-lg overflow-hidden">
                    {/* DÜZELTME: Görsel URL'i varsa Image bileşenini render et */}
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Henüz eser yok.</p>
          )}
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-teal-500" />
            Topluluk Liderleri
          </h2>
          {top_users?.length > 0 ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {top_users.map((user, index) => {
                  const displayName = user.username || user.email || "Anonim";
                  const fallback = displayName.substring(0, 2).toUpperCase();
                  return (
                    <Link
                      key={index}
                      href={user.username ? `/u/${user.username}` : "#"}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                    >
                      <Avatar className="h-10 w-10">
                        {/* DÜZELTME: Avatar URL'i varsa AvatarImage'ı render et */}
                        {user.avatar_url && (
                          <AvatarImage src={user.avatar_url} />
                        )}
                        <AvatarFallback>{fallback}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.reputation_points} Puan
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground">Henüz lider yok.</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
            <Rss className="w-6 h-6 text-orange-500" />
            Son Yazılar
          </h2>
          {latest_posts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latest_posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden transition-all hover:border-primary">
                    {/* DÜZELTME: Öne çıkan görsel URL'i varsa Image bileşenini render et */}
                    {post.featured_image_url && (
                      <div className="aspect-video relative">
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-3 text-sm">
                        {post.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Henüz yazı yok.</p>
          )}
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
            Son Eklenen Araçlar
          </h2>
          {latest_tools?.length > 0 ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                {latest_tools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={`/tool/${tool.slug}`}
                    className="block p-2 rounded-md hover:bg-muted"
                  >
                    <p className="font-semibold text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tool.category_name}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground">Henüz araç yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}

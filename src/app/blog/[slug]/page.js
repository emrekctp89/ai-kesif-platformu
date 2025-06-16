import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

// Veritabanından belirli bir yazıyı slug'ına göre çeken fonksiyon
async function getPost(slug) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true) // Sadece yayınlanmış yazıları getir
    .single();

  if (error || !data) {
    notFound(); // Yazı bulunamazsa 404 sayfasına yönlendir
  }
  return data;
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return {
    title: `${post.title} | AI Keşif Platformu`,
    description: post.description,
  };
}

export default async function PostPage({ params }) {
  const post = await getPost(params.slug);

  return (
    <article className="container mx-auto max-w-3xl py-12 px-4">
      {/* Yazı Başlığı ve Bilgileri */}
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
        <time
          dateTime={post.published_at}
          className="mt-4 block text-sm text-muted-foreground"
        >
          Yayınlanma Tarihi:{" "}
          {new Date(post.published_at).toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>

      {/* Öne Çıkan Görsel */}
      {post.featured_image_url && (
        <div className="aspect-video rounded-xl overflow-hidden mb-8">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Markdown İçeriğinin Gösterileceği Alan */}
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          // Markdown elementlerini kendi stillerimizle güzelleştiriyoruz
          components={{
            a: ({ node, ...props }) => (
              <a className="text-primary hover:underline" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-bold mt-8 mb-4" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-bold mt-6 mb-3" {...props} />
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}

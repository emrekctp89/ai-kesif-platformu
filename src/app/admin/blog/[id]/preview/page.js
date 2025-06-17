import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Bu fonksiyon, durumu ne olursa olsun bir yazıyı ID'sine göre çeker.
async function getPostForPreview(id) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }
  return data;
}

export default async function PreviewPostPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sadece admin bu sayfayı görebilir.
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  const post = await getPostForPreview(params.id);

  return (
    <article className="container mx-auto max-w-3xl py-12 px-4">
      <header className="mb-8">
        <p className="text-center p-2 bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md mb-4 text-sm">
          Bu sadece bir önizlemedir. Yazı henüz yayınlanmadı.
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
      </header>
      {post.featured_image_url && (
        <div className="aspect-video rounded-xl overflow-hidden mb-8">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}

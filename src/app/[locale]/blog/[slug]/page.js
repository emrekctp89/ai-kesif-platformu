import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Image from 'next/image';
import { generateBlogMetadata, generateStructuredData } from '@/utils/seo';

// Veritabanından belirli bir yazıyı slug'ına göre çeken fonksiyon
async function getPost(slug) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    // DEĞİŞİKLİK: 'is_published' yerine yeni 'status' sütununa göre filtreliyoruz
    .eq('status', 'Yayınlandı')
    .single();

  if (error || !data) {
    notFound(); // Yazı bulunamazsa veya yayınlanmamışsa 404
  }
  return data;
}

export async function generateMetadata(props) {
  const params = await props.params;
  const post = await getPost(params.slug);

  return generateBlogMetadata({
    title: `${post.title} | AI Keşif Platformu`,
    description: post.description,
    slug: post.slug,
    image: post.featured_image_url,
    publishedDate: post.published_at,
    modifiedDate: post.updated_at || post.published_at,
    author: post.author_name || 'AI Keşif Platformu',
  });
}

export default async function PostPage(props0) {
  const params = await props0.params;
  const post = await getPost(params.slug);

  const structuredData = generateStructuredData('Article', {
    title: post.title,
    description: post.description,
    image: post.featured_image_url,
    author: post.author_name || 'AI Keşif Platformu',
    publishedDate: post.published_at,
    modifiedDate: post.updated_at || post.published_at,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <article className="container mx-auto max-w-3xl py-12 px-4">
        {/* Yazı Başlığı ve Bilgileri */}
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
          <time dateTime={post.published_at} className="mt-4 block text-sm text-muted-foreground">
            Yayınlanma Tarihi:{' '}
            {new Date(post.published_at).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>

        {/* Öne Çıkan Görsel */}
        {post.featured_image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              width={1200}
              height={675}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Markdown İçeriğinin Gösterileceği Alan */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-bold mt-8 mb-4" {...props} />
              ),
              h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-6 mb-3" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </>
  );
}

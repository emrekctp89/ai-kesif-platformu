'use client';

import { useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';
import { submitCreatorPostForReview, updateCreatorPost } from '@/app/actions/contentCreators';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false });
import 'easymde/dist/easymde.min.css';

/**
 * @param {{ post: object, categories?: Array<{ id: number, name: string }> }} props
 */
export function CreatorPostEditor({ post, categories = [] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(post.content || '');
  const [type, setType] = useState(post.type || 'Yazı');
  const [categoryId, setCategoryId] = useState(
    post.category_id != null ? String(post.category_id) : 'none'
  );

  const editorOptions = useMemo(
    () => ({
      spellChecker: false,
      placeholder: 'Yazınızı buraya yazmaya başlayın...',
      toolbar: [
        'bold',
        'italic',
        'heading',
        '|',
        'quote',
        'unordered-list',
        'ordered-list',
        '|',
        'link',
        '|',
        'preview',
        'side-by-side',
      ],
    }),
    []
  );

  const lockedPublished = post.status === 'Yayınlandı';

  function withMeta(formData) {
    formData.set('content', content);
    formData.set('type', type);
    formData.set('category_id', categoryId === 'none' ? '' : categoryId);
    return formData;
  }

  function save(formData) {
    withMeta(formData);
    formData.set('status', post.status === 'İncelemede' ? 'İncelemede' : 'Taslak');
    startTransition(async () => {
      const result = await updateCreatorPost(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success || 'Kaydedildi');
        router.refresh();
      }
    });
  }

  function submitReview(formData) {
    withMeta(formData);
    startTransition(async () => {
      const result = await submitCreatorPostForReview(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success || 'İncelemeye gönderildi');
        router.refresh();
      }
    });
  }

  if (lockedPublished) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Yayınlandı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Bu yazı yayınlanmış. Düzenleme için admin ile iletişime geçin.</p>
          {post.slug ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Yayındaki yazıyı gör
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <form className="space-y-6">
      <input type="hidden" name="id" value={post.id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" name="title" defaultValue={post.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Kısa açıklama</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={post.description || ''}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label>İçerik (Markdown)</Label>
            <SimpleMDE options={editorOptions} value={content} onChange={setContent} />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Yayın bilgisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">URL uzantısı</Label>
                <Input id="slug" name="slug" defaultValue={post.slug} required />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yazı">Yazı</SelectItem>
                    <SelectItem value="Rehber">Rehber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {categories.length > 0 ? (
                <div className="space-y-2">
                  <Label>Kategori (opsiyonel)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kategori yok</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Durum: <span className="font-semibold text-foreground">{post.status}</span>
              </p>
              {post.review_note ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Admin notu: {post.review_note}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => {
                    const form = e.currentTarget.closest('form');
                    if (form) save(new FormData(form));
                  }}
                >
                  Taslağı kaydet
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={(e) => {
                    const form = e.currentTarget.closest('form');
                    if (form) submitReview(new FormData(form));
                  }}
                >
                  İncelemeye gönder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

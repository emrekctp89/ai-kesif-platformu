'use client';

import * as React from 'react';
import { useState, useMemo, useTransition } from 'react';
import { updatePost } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TranslateButton } from '@/components/TranslateButton';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Editörü sadece istemci tarafında yüklüyoruz
const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
});
import 'easymde/dist/easymde.min.css';

export function BlogEditor({ post }) {
  const [title, setTitle] = useState(post.title || '');
  const [description, setDescription] = useState(post.description || '');
  const [content, setContent] = useState(post.content || '');
  const [isPending, startTransition] = useTransition();

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
        'image',
        '|',
        'preview',
        'guide',
      ],
    }),
    []
  );

  const handleFormSubmit = (formData) => {
    formData.set('title', title);
    formData.set('description', description);
    formData.set('content', content);
    startTransition(async () => {
      const result = await updatePost(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Blog yazısı başarıyla güncellendi.');
      }
    });
  };

  return (
    <form action={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="slug" value={post.slug} />
      {/* Bu editörde değiştirilmeyen alanları gizli olarak gönderiyoruz */}
      <input type="hidden" name="type" value={post.type} />
      <input type="hidden" name="status" value={post.status} />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="title">Başlık</Label>
          <TranslateButton
            size="sm"
            getText={() => title}
            onTranslated={setTitle}
            label="Başlığı çevir"
          />
        </div>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="text-2xl h-12"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">Kısa Açıklama</Label>
          <TranslateButton
            size="sm"
            getText={() => description}
            onTranslated={setDescription}
            label="Açıklamayı çevir"
          />
        </div>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>İçerik</Label>
          <TranslateButton
            size="sm"
            getText={() => content}
            onTranslated={setContent}
            label="İçeriği çevir"
          />
        </div>
        <SimpleMDE options={editorOptions} value={content} onChange={setContent} />
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button variant="outline" asChild>
          <a href={`/admin/blog/${post.id}/preview`} target="_blank">
            Önizle
          </a>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </Button>
      </div>
    </form>
  );
}

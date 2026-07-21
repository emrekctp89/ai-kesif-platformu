'use client';
import logger from '@/utils/logger';

import * as React from 'react';
import { useTransition, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Share2,
  Copy,
  Check,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { generateTextWithGemini, generateImageWithImagen } from '@/app/actions';
import { AiMentorTab } from './AiMentorTab';

// Metin Üretici Sekmesi
function TextGeneratorTab({ onSaveHistory }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const formRef = React.useRef(null);

  const handleSubmit = (formData) => {
    const userPrompt = formData.get('prompt');
    if (!userPrompt) {
      toast.error('Lütfen bir istek girin.');
      return;
    }
    startTransition(async () => {
      const res = await generateTextWithGemini(userPrompt);
      if (res.success) {
        setResult(res.text);
        if (onSaveHistory) {
          onSaveHistory({ type: 'text', prompt: userPrompt, content: res.text });
        }
      } else {
        toast.error(res.error || 'Metin üretilirken bir hata oluştu.');
      }
    });
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Metin panoya kopyalandı!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metin Üretici (Gemini)</CardTitle>
        <CardDescription>
          Bir fikir verin, yapay zeka sizin için blog yazısı, sosyal medya gönderisi veya bir şiir
          yazsın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid w-full gap-2">
            <Label htmlFor="text-prompt">İsteğiniz</Label>
            <Textarea
              id="text-prompt"
              name="prompt"
              placeholder="Örn: 'Yapay zekanın geleceği hakkında bir blog yazısı için ilgi çekici bir giriş paragrafı yaz.'"
              className="min-h-[120px]"
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Üretiyorum...' : 'Metni Üret'}
          </Button>
        </form>
        {result && (
          <div className="relative p-4 bg-muted rounded-md border mt-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={copyToClipboard}
              title="Kopyala"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <p className="text-sm whitespace-pre-wrap pr-8">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Görsel Üretici Sekmesi
function ImageGeneratorTab({ onSaveHistory }) {
  const [isPending, startTransition] = useTransition();
  const [resultUrl, setResultUrl] = React.useState('');
  const [prompt, setPrompt] = React.useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userPrompt = formData.get('prompt');
    if (!userPrompt) {
      toast.error('Lütfen bir görsel tarifi girin.');
      return;
    }
    setPrompt(userPrompt);
    startTransition(async () => {
      const res = await generateImageWithImagen(userPrompt);
      if (res.success) {
        setResultUrl(res.url);
        if (onSaveHistory) {
          onSaveHistory({ type: 'image', prompt: userPrompt, content: res.url });
        }
      } else {
        toast.error(res.error || 'Görsel üretilirken bir hata oluştu.');
      }
    });
  };

  const handleShare = async () => {
    if (navigator.share && resultUrl) {
      try {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const file = new File([blob], 'ai-eser.png', { type: blob.type });

        await navigator.share({
          title: `AI Keşif Platformu ile Yaratıldı`,
          text: `"${prompt}" prompt'u ile oluşturduğum bu görsele bir bak!`,
          files: [file],
        });
      } catch (error) {
        logger.error('Paylaşma hatası:', error);
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    if (resultUrl) {
      navigator.clipboard.writeText(resultUrl);
      toast.success('Görsel bağlantısı panoya kopyalandı!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Görsel Üretici (Imagen)</CardTitle>
        <CardDescription>
          Hayalinizdeki sahneyi veya konsepti tarif edin, yapay zeka sizin için bir görsel yaratsın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full gap-2">
            <Label htmlFor="image-prompt">Görsel Tarifi (Prompt)</Label>
            <Textarea
              id="image-prompt"
              name="prompt"
              placeholder="Örn: 'siberpunk bir şehirde neon ışıkları altında yürüyen bir astronot, fotogerçekçi, detaylı'"
              className="min-h-[120px]"
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Yaratıyorum...' : 'Görseli Yarat'}
          </Button>
        </form>
        <div className="aspect-square relative mt-4 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
          {isPending && !resultUrl && (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm font-medium">Görsel Hazırlanıyor...</p>
            </div>
          )}
          {resultUrl && (
            <>
              <Image src={resultUrl} alt="Üretilen görsel" fill className="object-cover" />
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <Button asChild variant="secondary" size="icon" title="Görseli İndir">
                  <a href={resultUrl} download={`ai-eser-${prompt.slice(0, 10)}.png`}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  onClick={handleShare}
                  variant="secondary"
                  size="icon"
                  title="Görseli Paylaş"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Geçmiş Sekmesi
function HistoryTab({ history, clearHistory }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mb-4 opacity-20" />
          <p>Henüz bir üretim geçmişiniz bulunmuyor.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Üretim Geçmişi</CardTitle>
          <CardDescription>Son ürettiğiniz metinler ve görseller burada saklanır.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearHistory}
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Temizle
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {history.map((item) => (
          <div key={item.id} className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                {item.type === 'text' ? 'Metin' : 'Görsel'}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(item.date).toLocaleString('tr-TR')}
              </span>
            </div>
            <p className="text-sm font-medium mb-3 opacity-80 italic">"{item.prompt}"</p>
            {item.type === 'text' ? (
              <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded border">
                {item.content}
              </p>
            ) : (
              <div className="relative aspect-video w-full max-w-md rounded overflow-hidden border">
                <Image src={item.content} alt={item.prompt} fill className="object-cover" />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Ana Stüdyo Arayüz Bileşeni
export function StudioClient() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('ai_studio_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        logger.error('Geçmiş yüklenemedi', e);
      }
    }
  }, []);

  const handleSaveHistory = (newItem) => {
    const item = { ...newItem, id: Date.now().toString(), date: new Date().toISOString() };
    const updated = [item, ...history].slice(0, 50); // Son 50 kaydı tut
    setHistory(updated);
    localStorage.setItem('ai_studio_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (confirm('Tüm geçmişi silmek istediğinize emin misiniz?')) {
      setHistory([]);
      localStorage.removeItem('ai_studio_history');
      toast.success('Geçmiş temizlendi.');
    }
  };

  return (
    <Tabs defaultValue="mentor" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="mentor">Yaratıcı Atölye</TabsTrigger>
        <TabsTrigger value="text">Metin Üretici</TabsTrigger>
        <TabsTrigger value="image">Görsel Üretici</TabsTrigger>
        <TabsTrigger value="history" className="flex items-center">
          Geçmiş
          {history.length > 0 && (
            <span className="ml-2 text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="mentor">
        <AiMentorTab />
      </TabsContent>
      <TabsContent value="text">
        <TextGeneratorTab onSaveHistory={handleSaveHistory} />
      </TabsContent>
      <TabsContent value="image">
        <ImageGeneratorTab onSaveHistory={handleSaveHistory} />
      </TabsContent>
      <TabsContent value="history">
        <HistoryTab history={history} clearHistory={clearHistory} />
      </TabsContent>
    </Tabs>
  );
}

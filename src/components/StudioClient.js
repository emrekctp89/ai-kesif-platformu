"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Image as ImageIcon, Download, Share2 } from "lucide-react"; // Yeni ikonları import ediyoruz
import Image from "next/image";
import toast from "react-hot-toast";
import { generateTextWithGemini, generateImageWithImagen } from "@/app/actions";

// Metin Üretici Sekmesi (Değişiklik yok)
function TextGeneratorTab() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = React.useState("");
  const formRef = React.useRef(null);

  const handleSubmit = (formData) => {
    const userPrompt = formData.get("prompt");
    if (!userPrompt) {
      toast.error("Lütfen bir istek girin.");
      return;
    }
    startTransition(async () => {
      const result = await generateTextWithGemini(userPrompt);
      if (result.success) {
        setResult(result.text);
      } else {
        toast.error(result.error || "Metin üretilirken bir hata oluştu.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metin Üretici (Gemini)</CardTitle>
        <CardDescription>
          Bir fikir verin, yapay zeka sizin için blog yazısı, sosyal medya
          gönderisi veya bir şiir yazsın.
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
            <Sparkles className="mr-2 h-4 w-4" />
            {isPending ? "Üretiyorum..." : "Metni Üret"}
          </Button>
        </form>
        {result && (
          <div className="p-4 bg-muted rounded-md border">
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Görsel Üretici Sekmesi
function ImageGeneratorTab() {
  const [isPending, startTransition] = useTransition();
  const [resultUrl, setResultUrl] = React.useState("");
  const [prompt, setPrompt] = React.useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userPrompt = formData.get("prompt");
    if (!userPrompt) {
      toast.error("Lütfen bir görsel tarifi girin.");
      return;
    }
    setPrompt(userPrompt);
    startTransition(async () => {
      const result = await generateImageWithImagen(userPrompt);
      if (result.success) {
        setResultUrl(result.url);
      } else {
        toast.error(result.error || "Görsel üretilirken bir hata oluştu.");
      }
    });
  };

  // Modern Web Share API'sini kullanarak paylaşma fonksiyonu
  const handleShare = async () => {
    if (navigator.share && resultUrl) {
      try {
        // data: URL'ini bir dosyaya dönüştürüyoruz
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const file = new File([blob], "ai-eser.png", { type: blob.type });

        await navigator.share({
          title: `AI Keşif Platformu ile Yaratıldı`,
          text: `"${prompt}" prompt'u ile oluşturduğum bu görsele bir bak!`,
          files: [file],
        });
      } catch (error) {
        console.error("Paylaşma hatası:", error);
        toast.error("Görsel paylaşılamadı.");
      }
    } else {
      toast.error("Tarayıcınız bu paylaşma özelliğini desteklemiyor.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Görsel Üretici (Imagen)</CardTitle>
        <CardDescription>
          Hayalinizdeki sahneyi veya konsepti tarif edin, yapay zeka sizin için
          bir görsel yaratsın.
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
            <ImageIcon className="mr-2 h-4 w-4" />
            {isPending ? "Yaratıyorum..." : "Görseli Yarat"}
          </Button>
        </form>
        <div className="aspect-square relative mt-4 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
          {isPending && !resultUrl && (
            <p className="text-muted-foreground">Yükleniyor...</p>
          )}
          {resultUrl && (
            <>
              <Image
                src={resultUrl}
                alt="Üretilen görsel"
                fill
                className="object-cover"
              />
              {/* DEĞİŞİKLİK: İndirme ve Paylaşma Butonları */}
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <Button
                  asChild
                  variant="secondary"
                  size="icon"
                  title="Görseli İndir"
                >
                  <a
                    href={resultUrl}
                    download={`ai-eser-${prompt.slice(0, 10)}.png`}
                  >
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

// Ana Stüdyo Arayüz Bileşeni
export function StudioClient() {
  return (
    <Tabs defaultValue="text" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="text">Metin Üretici</TabsTrigger>
        <TabsTrigger value="image">Görsel Üretici</TabsTrigger>
      </TabsList>
      <TabsContent value="text">
        <TextGeneratorTab />
      </TabsContent>
      <TabsContent value="image">
        <ImageGeneratorTab />
      </TabsContent>
    </Tabs>
  );
}

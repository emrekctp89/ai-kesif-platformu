"use client";

import * as React from "react";
import { useTransition, useRef, useEffect } from "react";
import { getAdminCoPilotResponse, getAiCodeReview } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  User,
  CornerDownLeft,
  Lightbulb,
  Clipboard,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

// AI'ın sohbet cevabını formatlayan bileşen
function AiChatResponse({ data, onQuestionClick }) {
  if (!data)
    return <p className="text-destructive">Analiz verisi alınamadı.</p>;
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">
        {data.response_title || "Yapay Zeka Analizi"}
      </h3>
      <p className="text-sm text-muted-foreground">{data.response_text}</p>
      {data.follow_up_questions?.length > 0 && (
        <div className="pt-4 border-t border-background/50">
          <h4 className="text-xs font-semibold mb-2">Devam edebiliriz:</h4>
          <div className="flex flex-wrap gap-2">
            {data.follow_up_questions.map((question, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => onQuestionClick(question)}
                className="text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Kod analizi için AI'ın cevabını formatlayan bileşen
function AiCodeReviewResponse({ data }) {
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Kod panoya kopyalandı!");
  };
  if (!data)
    return <p className="text-destructive">Analiz verisi alınamadı.</p>;
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">{data.analysis_title}</h3>
      <div>
        <h4 className="font-semibold mb-2">Öneriler</h4>
        <ul className="space-y-2 list-disc pl-5 text-sm">
          {data.suggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Yeniden Yazılmış Kod</h4>
        <div className="relative bg-black rounded-md p-4 font-mono text-xs text-white">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => handleCopy(data.refactored_code)}
          >
            <Clipboard className="h-4 w-4" />
          </Button>
          <pre>
            <code>{data.refactored_code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// Sohbet Asistanı Sekmesi
function ChatTab() {
  const [messages, setMessages] = React.useState([
    {
      role: "ai",
      content:
        "Merhaba! Ben Admin Co-Pilot. Platformunuzu geliştirmek için bana stratejik sorular sorabilirsiniz.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isPending, startTransition] = useTransition();
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (promptText) => {
    if (!promptText.trim() || isPending) return;
    const newUserMessage = { role: "user", content: promptText };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput("");
    startTransition(async () => {
      const result = await getAdminCoPilotResponse(promptText, newMessages);
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Bir hata oluştu: ${result.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: result.data, isResponse: true },
        ]);
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-4 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "ai" && (
              <Avatar className="h-9 w-9 border-2 border-primary">
                <AvatarFallback>
                  <Bot />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-xl rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {msg.isResponse ? (
                <AiChatResponse
                  data={msg.content}
                  onQuestionClick={sendMessage}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isPending && (
          <div className="flex items-start gap-4 animate-pulse">
            <Avatar className="h-9 w-9 border-2 border-primary">
              <AvatarFallback>
                <Bot />
              </AvatarFallback>
            </Avatar>
            <div className="max-w-sm rounded-lg p-4 bg-muted">
              <div className="h-2 w-24 bg-slate-400 rounded"></div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Platformu geliştirmek için bir soru sorun..."
            className="pr-20 min-h-[50px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-3 right-3"
            disabled={isPending || !input.trim()}
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Kod Analiz Stüdyosu Sekmesi
function CodeStudioTab() {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = React.useState("");
  const [analysis, setAnalysis] = React.useState(null);

  const handleAnalyze = () => {
    startTransition(async () => {
      setAnalysis(null);
      const result = await getAiCodeReview(code);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAnalysis(result.data);
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex flex-col gap-4 lg:w-1/2">
        <Label htmlFor="code-input" className="text-lg font-semibold">
          Analiz Edilecek Kod
        </Label>
        <Textarea
          id="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Analiz etmek istediğiniz React bileşen kodunu buraya yapıştırın..."
          className="flex-1 font-mono resize-none"
        />
        <Button
          onClick={handleAnalyze}
          disabled={isPending || code.length < 50}
        >
          {isPending ? "Analiz Ediliyor..." : "Analiz Et ve İyileştir"}
        </Button>
      </div>
      <div className="flex flex-col gap-4 lg:w-1/2">
        <Label className="text-lg font-semibold">Analiz Sonuçları</Label>
        <div className="bg-muted/50 p-6 rounded-lg overflow-y-auto flex-1 border">
          {isPending && <p>Analiz ediliyor, lütfen bekleyin...</p>}
          {analysis ? (
            <AiCodeReviewResponse data={analysis} />
          ) : (
            !isPending && (
              <p className="text-muted-foreground">
                Analiz sonuçları burada görünecektir.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Ana Co-Pilot Bileşeni
export function CoPilotClient() {
  return (
    <Tabs defaultValue="chat" className="flex flex-col h-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chat">Sohbet Asistanı</TabsTrigger>
        <TabsTrigger value="code">Kod Analiz Stüdyosu</TabsTrigger>
      </TabsList>
      {/* DEĞİŞİKLİK: Her iki sekme içeriğinin de esnek bir şekilde büyümesini ve taşmamasını sağlıyoruz */}
      <TabsContent value="chat" className="flex-1 min-h-0">
        <ChatTab />
      </TabsContent>
      <TabsContent value="code" className="flex-1 flex flex-col p-4 min-h-0">
        <CodeStudioTab />
      </TabsContent>
    </Tabs>
  );
}

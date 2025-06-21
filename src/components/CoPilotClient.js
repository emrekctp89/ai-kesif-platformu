"use client";

import * as React from "react";
import { useTransition, useRef, useEffect } from "react";
import { getAdminCoPilotResponse } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, CornerDownLeft, Lightbulb, Clipboard } from "lucide-react";
import toast from "react-hot-toast";

// AI'ın cevabını formatlayan bileşen
function AiResponse({ data }) {
  if (!data)
    return <p className="text-destructive">Analiz verisi alınamadı.</p>;

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Kod panoya kopyalandı!");
  };

  return (
    <Card className="bg-background/50 border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          {data.response_title || "Yapay Zeka Analizi"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {data.response_text && (
          <p className="text-muted-foreground">{data.response_text}</p>
        )}

        {/* DEĞİŞİKLİK: Kod önerisi varsa, onu göster */}
        {data.code_suggestion && (
          <div className="space-y-2">
            <h4 className="font-semibold">Kod Önerisi:</h4>
            <p className="text-xs text-muted-foreground">
              {data.code_suggestion.explanation}
            </p>
            <div className="relative bg-black rounded-md p-4 font-mono text-xs text-white">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => handleCopy(data.code_suggestion.code)}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
              <pre>
                <code>{data.code_suggestion.code}</code>
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CoPilotClient() {
  const [messages, setMessages] = React.useState([
    {
      role: "ai",
      content:
        "Merhaba! Ben Admin Co-Pilot. Sitenizi geliştirmek için benden kod veya strateji isteyebilirsiniz.",
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const newUserMessage = { role: "user", content: input };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput("");

    startTransition(async () => {
      const result = await getAdminCoPilotResponse(input, newMessages);
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
                <AiResponse data={msg.content} />
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
            placeholder="Platformu geliştirmek için bir soru sorun veya kod isteyin..."
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

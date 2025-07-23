"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { handleOnboardingStep } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, CornerDownLeft } from "lucide-react";
import { motion } from "framer-motion";

export function OnboardingAssistant() {
  const router = useRouter();
  const [messages, setMessages] = React.useState([
    {
      role: "ai",
      content:
        "Merhaba! Ben AI Keşif Platformu'nun karşılama asistanıyım. Size en iyi deneyimi sunabilmem için ilgi alanlarınızı öğrenmek istiyorum. Hangi konularla daha çok ilgileniyorsunuz? (Örn: Görsel Üretimi, Metin Yazarlığı, Kodlama...)",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isPending, startTransition] = useTransition();
  const chatContainerRef = React.useRef(null);

  React.useEffect(() => {
    chatContainerRef.current?.scrollTo(
      0,
      chatContainerRef.current.scrollHeight
    );
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const newUserMessage = { role: "user", content: input };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput("");

    startTransition(async () => {
      const result = await handleOnboardingStep(newMessages, input);
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Bir hata oluştu: ${result.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: result.data.response_text },
        ]);
        if (result.data.action === "complete") {
          // DEĞİŞİKLİK: Kullanıcıya son mesajı okuması için 3 saniye veriyoruz,
          // ardından sayfayı akıllı bir şekilde yeniliyoruz.
          setTimeout(() => {
            router.refresh();
          }, 3000);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl h-[80vh] bg-card border rounded-lg shadow-2xl flex flex-col"
      >
        <div className="p-4 border-b text-center">
          <h2 className="text-xl font-bold">Platforma Hoş Geldiniz!</h2>
          <p className="text-sm text-muted-foreground">
            Deneyiminizi kişiselleştirelim.
          </p>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
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
                className={`max-w-md rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
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
              <div className="max-w-xs rounded-lg p-4 bg-muted">
                <div className="h-2 w-20 bg-slate-400 rounded"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cevabınızı buraya yazın..."
              className="pr-12 h-10"
              disabled={isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
              disabled={isPending || !input.trim()}
            >
              <CornerDownLeft className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

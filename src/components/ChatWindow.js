"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { sendMessage, markConversationAsRead } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft } from "lucide-react"; // ArrowLeft ikonunu import ediyoruz
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Paylaşılan içerik için özel bir kart oluşturan alt bileşen
function SharedContentCard({ content }) {
  if (!content || !content.type) return null;

  // Paylaşılan içeriğin türüne göre farklı bir kart gösteriyoruz
  switch (content.type) {
    case "tool":
      return (
        <Link href={`/tool/${content.slug}`} target="_blank" className="block">
          <Card className="bg-background/50 hover:bg-background/80 transition-colors">
            <CardHeader className="p-3">
              <CardTitle className="text-base">{content.name}</CardTitle>
              {content.description && (
                <CardDescription className="text-xs line-clamp-2">
                  {content.description}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        </Link>
      );
    // Gelecekte 'eser', 'prompt' gibi türler için de benzer kartlar eklenebilir.
    default:
      return null;
  }
}

// Tek bir mesaj baloncuğunu gösteren alt bileşen
function MessageBubble({ message, isCurrentUser }) {
  const profile = message.profiles;
  const fallback =
    profile?.username?.substring(0, 2).toUpperCase() ||
    profile?.email?.substring(0, 2).toUpperCase() ||
    "??";

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-xs md:max-w-md rounded-2xl",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {/* Eğer mesajda metin varsa, onu göster */}
        {message.content && (
          <p className="text-sm px-3 py-2">{message.content}</p>
        )}

        {/* Eğer mesajda paylaşılan içerik varsa, özel kartını göster */}
        {message.shared_content && (
          <div className="p-2">
            <SharedContentCard content={message.shared_content} />
          </div>
        )}
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export function ChatWindow({
  conversationId,
  initialMessages,
  otherParticipant,
  currentUser,
}) {
  const supabase = createClient();
  const router = useRouter(); // Router'ı kullanıma hazırlıyoruz
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleNewMessage = async (payload) => {
      const newMessage = payload.new;
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("username, avatar_url, email")
        .eq("id", newMessage.sender_id)
        .single();
      const messageWithSender = { ...newMessage, profiles: senderProfile };
      setMessages((currentMessages) => [...currentMessages, messageWithSender]);
    };

    const channel = supabase
      .channel(`messages_for_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleNewMessage
      )
      .subscribe();
    // DEĞİŞİKLİK: Artık sadece Server Action'ı çağırıyoruz. Yenileme işini o halledecek.
    markConversationAsRead(conversationId);

    return () => {
      supabase.removeChannel(channel);
    };
    // DEĞİŞİKLİK: router'a artık ihtiyacımız olmadığı için bağımlılıklardan kaldırdık.
  }, [supabase, conversationId]);

  const handleSendMessage = async (formData) => {
    const content = formData.get("content");
    if (!content.trim()) return;

    const form = document.getElementById("message-form");
    form.reset();

    const optimisticMessage = {
      id: Date.now(),
      content: content.trim(),
      sender_id: currentUser.id,
      profiles: {
        username: currentUser.username,
        avatar_url: currentUser.avatar_url,
        email: currentUser.email,
      },
      created_at: new Date().toISOString(),
    };
    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);

    await sendMessage(formData);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b flex items-center gap-3">
        {/* YENİ: Mobil için "Geri" butonu */}
        <Link href="/mesajlar" className="md:hidden mr-2">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Avatar>
          <AvatarImage src={otherParticipant?.avatar_url} />
          <AvatarFallback>
            {otherParticipant?.username?.substring(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold">
          {otherParticipant?.username || otherParticipant?.email}
        </h3>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.sender_id === currentUser.id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <footer className="p-4 border-t">
        <form
          id="message-form"
          action={handleSendMessage}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="conversationId" value={conversationId} />
          <Textarea
            name="content"
            placeholder="Bir mesaj yazın..."
            className="flex-1 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.closest("form").requestSubmit();
              }
            }}
          />
          <Button type="submit" size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}

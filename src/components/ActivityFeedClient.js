"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client"; // İstemci tarafı client'ını kullanıyoruz
import { fetchActivityFeed } from "@/app/actions";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Star, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Her bir olay türü için farklı bir kart tasarımı
const eventComponents = {
  new_favorite: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <Heart className="w-6 h-6 text-red-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/tool/${event.details.tool_slug}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.tool_name}
          </Link>{" "}
          aracını favorilerine ekledi.
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
  // Diğer olay türleri için de benzer bileşenler...
  new_comment: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <MessageSquare className="w-6 h-6 text-blue-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/tool/${event.details.tool_slug}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.tool_name}
          </Link>{" "}
          aracına yeni bir yorum yaptı.
        </p>
        <p className="text-xs italic text-muted-foreground mt-1">
          "{event.details.comment_content}"
        </p>
        <time className="text-xs text-muted-foreground mt-2 block">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
  new_showcase: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <ImageIcon className="w-6 h-6 text-green-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/eserler?eserId=${event.details.item_id}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.item_title}
          </Link>{" "}
          adlı yeni bir eser paylaştı.
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
      <img
        src={event.details.item_image_url}
        alt={event.details.item_title}
        className="w-12 h-12 object-cover rounded-md ml-auto"
      />
    </CardContent>
  ),
  new_prompt: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <Star className="w-6 h-6 text-yellow-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/tool/${event.details.tool_slug}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.tool_name}
          </Link>{" "}
          için yeni bir prompt paylaştı: "{event.details.prompt_title}"
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
};

// Ana Canlı Akış Bileşeni
export function ActivityFeedClient({ initialFeedItems }) {
  const [feedItems, setFeedItems] = useState(initialFeedItems);
  const supabase = createClient();

  useEffect(() => {
    // Yeni bir olay gerçekleştiğinde çalışacak olan fonksiyon
    const handleNewEvent = (payload) => {
      console.log("Yeni bir olay alındı!", payload);
      // Sunucudan en güncel akışı yeniden çekiyoruz
      fetchActivityFeed().then((newItems) => {
        setFeedItems(newItems);
      });
    };

    // İlgili tüm tablolardaki INSERT olaylarını dinlemek için abonelikler oluşturuyoruz
    const channels = [
      "favorites",
      "comments",
      "prompts",
      "showcase_items",
      "showcase_comments",
      "showcase_votes",
    ].map((table) =>
      supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: table },
          handleNewEvent
        )
        .subscribe()
    );

    // Component ekrandan kaldırıldığında tüm abonelikleri temizliyoruz
    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {feedItems.map((event, index) => {
          const EventComponent = eventComponents[event.event_type];
          return EventComponent ? (
            <motion.div
              key={`${event.event_type}-${event.details?.tool_slug || event.details?.item_id}-${event.event_time}`}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <Card className="transition-all hover:shadow-md">
                <EventComponent event={event} />
              </Card>
            </motion.div>
          ) : null;
        })}
      </AnimatePresence>
    </div>
  );
}

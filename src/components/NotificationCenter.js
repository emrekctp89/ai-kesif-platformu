"use client";

import * as React from "react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Star, MessageSquare } from "lucide-react";
import { getNotifications, markNotificationsAsRead } from "@/app/actions";

// Hangi bildirim türünün hangi ikonu kullanacağını belirleyen yardımcı obje
const eventIcons = {
  prompt_oyu_aldi: <Star className="w-4 h-4 text-yellow-500" />,
  // Gelecekte eklenebilecek diğer bildirim türleri için ikonlar...
};

export function NotificationCenter({
  initialNotifications,
  unreadCount,
  user,
}) {
  const [notifications, setNotifications] =
    React.useState(initialNotifications);
  const [hasUnread, setHasUnread] = React.useState(unreadCount > 0);

  const handleOpenChange = async (open) => {
    // Menü açıldığında ve okunmamış bildirim varsa,
    // onları okundu olarak işaretle.
    if (open && hasUnread) {
      await markNotificationsAsRead();
      setHasUnread(false);
    }
  };

  if (!user) {
    return null; // Giriş yapmamışsa butonu hiç gösterme
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {/* Okunmamış bildirim varsa kırmızı noktayı göster */}
          {hasUnread && (
            <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="p-4">
          <h3 className="font-semibold mb-2">Bildirimler</h3>
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.link || "#"}
                  className="block p-3 rounded-lg hover:bg-muted"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {eventIcons[notif.event_type] || (
                        <Bell className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.created_at).toLocaleDateString(
                          "tr-TR",
                          { day: "numeric", month: "long" }
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Yeni bildiriminiz yok.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image"; // Next.js'in Image bileşenini import ediyoruz
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShowcaseDetailModal } from "./ShowcaseDetailModal";
import { FileText, Code } from "lucide-react";

const contentTypeIcons = {
  Metin: <FileText className="w-8 h-8 text-muted-foreground" />,
  Kod: <Code className="w-8 h-8 text-muted-foreground" />,
};

export function ShowcaseGallery({ items, user }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = searchParams.get("eserId");

  const selectedItem = selectedId
    ? items.find((item) => item.id.toString() === selectedId)
    : null;
  const selectedIndex = selectedItem ? items.indexOf(selectedItem) : -1;

  const handleNavigate = (direction) => {
    const newIndex =
      direction === "next" ? selectedIndex + 1 : selectedIndex - 1;
    if (newIndex >= 0 && newIndex < items.length) {
      router.push(`${pathname}?eserId=${items[newIndex].id}`, {
        scroll: false,
      });
    }
  };

  const handleModalClose = () => {
    router.push(pathname, { scroll: false });
  };

  return (
    <>
      <div className="masonry-grid">
        {items.map((item) => {
          const userProfile = {
            username: item.author_username,
            email: item.author_email,
            avatar_url: item.author_avatar_url,
          };
          const fallback =
            userProfile.email?.substring(0, 2).toUpperCase() || "??";

          return (
            <div key={item.id} className="masonry-grid-item">
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary group">
                <Link
                  href={`${pathname}?eserId=${item.id}`}
                  scroll={false}
                  className="block"
                >
                  <CardContent className="p-0">
                    {item.content_type === "Görsel" ? (
                      <div className="w-full overflow-hidden bg-muted aspect-square relative">
                        {/* DEĞİŞİKLİK: <img> yerine <Image> kullanıyoruz */}
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="p-6 bg-muted/50 aspect-[4/3] flex flex-col justify-center items-center">
                        {contentTypeIcons[item.content_type]}
                        <p className="mt-4 text-center text-muted-foreground text-sm line-clamp-3 italic">
                          "{item.content_text}"
                        </p>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-card-foreground line-clamp-1">
                        {item.title}
                      </h3>
                    </div>
                  </CardContent>
                </Link>
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 mt-2">
                    {userProfile.username ? (
                      <Link
                        href={`/u/${userProfile.username}`}
                        className="group/user flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={userProfile.avatar_url} />
                          <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground group-hover/user:text-primary">
                          {userProfile.username}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={userProfile.avatar_url} />
                          <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {userProfile.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && handleModalClose()}
      >
        <ShowcaseDetailModal
          item={selectedItem}
          onNavigate={handleNavigate}
          hasNext={selectedIndex < items.length - 1}
          hasPrev={selectedIndex > 0}
          user={user}
        />
      </Dialog>
    </>
  );
}

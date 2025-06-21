"use client";

import * as React from "react";
import { Label } from "@/components/ui/label"; // Eğer Shadcn UI kullanıyorsan

import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  searchUsers,
  getRecentConversationsForShare,
  sendMessageWithSharedContent,
} from "@/app/actions";
import { useDebounce } from "use-debounce";
import toast from "react-hot-toast";

// Arama sonuçlarını veya son sohbetleri gösteren liste
function UserList({ users, selectedRecipients, onSelect }) {
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => onSelect(user)}
          className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted"
        >
          <input
            type="checkbox"
            checked={selectedRecipients.some((r) => r.id === user.id)}
            readOnly
            className="h-4 w-4"
          />
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback>
              {(user.username || user.email).substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">{user.username || user.email}</p>
        </div>
      ))}
    </div>
  );
}

// Ana Paylaşım Penceresi Bileşeni
export function ShareDialog({ sharedContent, children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = React.useState([]);
  const [recentUsers, setRecentUsers] = React.useState([]);
  const [selectedRecipients, setSelectedRecipients] = React.useState([]);

  // Son sohbetleri çek
  React.useEffect(() => {
    getRecentConversationsForShare().then(setRecentUsers);
  }, []);

  // Arama yapıldığında kullanıcıları bul
  React.useEffect(() => {
    if (debouncedSearchTerm) {
      searchUsers(debouncedSearchTerm).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  // Bir kullanıcıyı seçme/kaldırma mantığı
  const handleSelectRecipient = (user) => {
    setSelectedRecipients((prev) => {
      if (prev.some((r) => r.id === user.id)) {
        return prev.filter((r) => r.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Formu gönder
  const handleFormAction = (formData) => {
    formData.append("sharedContent", JSON.stringify(sharedContent));
    selectedRecipients.forEach((r) => formData.append("recipients", r.id));

    startTransition(async () => {
      const result = await sendMessageWithSharedContent(formData);
      if (result?.success) {
        toast.success(result.success);
        setIsOpen(false);
        setSelectedRecipients([]);
      } else {
        toast.error(result.error || "Bir hata oluştu.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Başkalarıyla Paylaş</DialogTitle>
          <DialogDescription>
            Bu içeriği platformdaki diğer kullanıcılara özel mesajla gönderin.
          </DialogDescription>
        </DialogHeader>
        <form action={handleFormAction} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Kime:</Label>
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 border rounded-md">
                {selectedRecipients.map((user) => (
                  <Badge key={user.id} variant="secondary">
                    {user.username || user.email}
                    <button
                      onClick={() => handleSelectRecipient(user)}
                      className="ml-1 font-bold"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              placeholder="Kullanıcı adı veya e-posta ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {searchTerm ? (
            <UserList
              users={searchResults}
              selectedRecipients={selectedRecipients}
              onSelect={handleSelectRecipient}
            />
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">
                Son Sohbetler
              </Label>
              <UserList
                users={recentUsers}
                selectedRecipients={selectedRecipients}
                onSelect={handleSelectRecipient}
              />
            </div>
          )}

          <Textarea name="note" placeholder="Bir not ekle (isteğe bağlı)..." />

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || selectedRecipients.length === 0}
            >
              {isPending
                ? "Gönderiliyor..."
                : `Gönder (${selectedRecipients.length})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

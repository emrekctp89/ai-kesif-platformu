"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { submitToBounty, acceptBountySubmission } from "@/app/actions";
import toast from "react-hot-toast";
import { Check, ChevronsUpDown, Trophy, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Yeni Öneri Gönderme Penceresi
function SubmitToolDialog({ bountyId, allTools }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedToolId, setSelectedToolId] = React.useState(null);
  const formRef = React.useRef(null);

  const handleFormAction = (formData) => {
    if (!selectedToolId) {
      toast.error("Lütfen bir araç seçin.");
      return;
    }
    formData.append("toolId", selectedToolId);

    startTransition(async () => {
      const result = await submitToBounty(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Ödül İçin Araç Öner</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödül İçin Araç Öner</DialogTitle>
          <DialogDescription>
            Bu ihtiyacı karşıladığını düşündüğünüz bir aracı önerin.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleFormAction}
          className="space-y-4 py-2"
        >
          <input type="hidden" name="bountyId" value={bountyId} />
          <div className="space-y-2">
            <Label>Araç Seçin *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedToolId
                    ? allTools.find((t) => t.id === selectedToolId)?.name
                    : "Bir araç seçin..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Araç ara..." />
                  <CommandList>
                    <CommandEmpty>Araç bulunamadı.</CommandEmpty>
                    <CommandGroup>
                      {allTools.map((tool) => (
                        <CommandItem
                          key={tool.id}
                          value={tool.name}
                          onSelect={() => setSelectedToolId(tool.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedToolId === tool.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {tool.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notlarınız (İsteğe Bağlı)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Bu aracın neden uygun olduğunu düşündüğünüzü açıklayın..."
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Gönderiliyor..." : "Öneriyi Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Ana Öneri Listesi ve Yönetim Bileşeni
export function BountySubmissions({
  bounty,
  submissions,
  allTools,
  currentUser,
}) {
  const isOwner = currentUser?.id === bounty.user_id;

  const handleAcceptSubmission = async (submissionId) => {
    if (
      !confirm(
        "Bu öneriyi kazanan olarak seçmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("submissionId", submissionId);

    toast.promise(acceptBountySubmission(formData), {
      loading: "İşlem yapılıyor...",
      success: (result) => result.success || "İşlem başarılı!",
      error: (result) => result.error || "Bir hata oluştu.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Öneriler ({submissions.length})</h2>
        {/* DEĞİŞİKLİK: Ödül sahibi değilse ve ödül hala açıksa, öneri yapma butonu gösterilir */}
        {currentUser && !isOwner && bounty.status === "Açık" && (
          <SubmitToolDialog bountyId={bounty.id} allTools={allTools} />
        )}
      </div>
      <div className="space-y-4">
        {submissions.map((sub) => (
          <Card
            key={sub.id}
            className={cn(
              sub.is_winner && "border-2 border-green-500 bg-green-500/10"
            )}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={sub.profiles.avatar_url} />
                    <AvatarFallback>
                      {sub.profiles.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{sub.profiles.username}</p>
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={`/tool/${sub.tools.slug}`}
                        className="text-primary hover:underline"
                      >
                        {sub.tools.name}
                      </Link>{" "}
                      aracını önerdi.
                    </p>
                  </div>
                </div>
                {sub.is_winner && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Kazanan
                  </Badge>
                )}
              </div>
              {sub.notes && (
                <p className="text-sm italic text-muted-foreground mt-3 ml-14 p-3 bg-background/50 rounded-md">
                  &quot;{sub.notes}&quot;
                </p>
              )}

              {isOwner && bounty.status === "Açık" && (
                <div className="flex justify-end mt-4">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptSubmission(sub.id)}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    Kazanan Olarak Seç
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

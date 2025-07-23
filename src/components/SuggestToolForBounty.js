"use client";

import * as React from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitToBounty } from "@/app/actions";
import toast from "react-hot-toast";
import { Trophy } from "lucide-react";

// DEĞİŞİKLİK: Bu bileşen artık currentUser prop'unu almıyor, çünkü bu sayfa zaten giriş yapmış kullanıcılar için.
export function SuggestToolForBounty({ toolId, openBounties }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedBountyId, setSelectedBountyId] = React.useState(null);
  const formRef = React.useRef(null);

  // Eğer kullanıcının önerebileceği aktif bir ödül ilanı yoksa, butonu hiç gösterme
  if (!openBounties || openBounties.length === 0) {
    return null;
  }

  const handleFormAction = (formData) => {
    if (!selectedBountyId) {
      toast.error("Lütfen bir ödül ilanı seçin.");
      return;
    }
    formData.append("bountyId", selectedBountyId);

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
        <Button variant="outline">
          <Trophy className="mr-2 h-4 w-4" />
          Bir Ödüle Öner
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bu Aracı Bir Ödüle Öner</DialogTitle>
          <DialogDescription>
            Bu aracın, aşağıdaki aktif ödül ilanlarından hangisinin ihtiyacını
            karşıladığını düşünüyorsunuz?
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleFormAction}
          className="space-y-4 py-2"
        >
          <input type="hidden" name="toolId" value={toolId} />

          <RadioGroup
            onValueChange={(value) => setSelectedBountyId(value)}
            className="space-y-2 max-h-48 overflow-y-auto"
          >
            {openBounties.map((bounty) => (
              <Label
                key={bounty.id}
                htmlFor={`bounty-${bounty.id}`}
                className="flex items-center gap-4 p-3 rounded-md border has-[:checked]:border-primary cursor-pointer"
              >
                <RadioGroupItem value={bounty.id} id={`bounty-${bounty.id}`} />
                <div>
                  <p className="font-semibold">{bounty.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Ödül: {bounty.reputation_reward} Puan
                  </p>
                </div>
              </Label>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlarınız (İsteğe Bağlı)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Bu aracın neden bu ödül için uygun olduğunu düşündüğünüzü açıklayın..."
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
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

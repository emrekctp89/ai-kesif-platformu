"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitToolLinkReport } from "@/app/actions";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";

const reasonOptions = [
  { value: "broken", label: "Site açılmıyor / kırık link" },
  { value: "redirects_wrong", label: "Yanlış siteye yönlendiriyor" },
  { value: "suspicious", label: "Şüpheli veya güvenli görünmüyor" },
  { value: "outdated", label: "Link güncel değil" },
  { value: "other", label: "Diğer" },
];

export function ToolLinkReportDialog({ tool }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [detailsLength, setDetailsLength] = React.useState(0);
  const [isPending, startTransition] = useTransition();
  const formRef = React.useRef(null);

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await submitToolLinkReport(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.success || "Rapor alındı.");
      formRef.current?.reset();
      setDetailsLength(0);
      setIsOpen(false);
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setStartedAt(Date.now());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 w-full justify-center">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Link Hatalı Bildir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tool.name} linkini bildir</DialogTitle>
          <DialogDescription>
            Resmî site açılmıyor, yanlış sayfaya gidiyor veya şüpheli görünüyorsa ekibe iletin.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleFormAction} className="space-y-4 py-2">
          <input type="hidden" name="toolId" value={tool.id} />
          <input type="hidden" name="toolSlug" value={tool.slug} />
          <input type="hidden" name="reportedUrl" value={tool.link} />
          <input type="hidden" name="started_at" value={startedAt} />

          <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <Label htmlFor={`tool-link-report-company-${tool.id}`}>Şirket web sitesi</Label>
            <input
              id={`tool-link-report-company-${tool.id}`}
              name="company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Raporlanan bağlantı</p>
            <p className="mt-1 break-all">{tool.link}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`tool-link-report-reason-${tool.id}`}>Sorun türü</Label>
            <select
              id={`tool-link-report-reason-${tool.id}`}
              name="reason"
              required
              disabled={isPending}
              defaultValue="broken"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`tool-link-report-email-${tool.id}`}>E-posta adresiniz (opsiyonel)</Label>
            <Input
              id={`tool-link-report-email-${tool.id}`}
              name="reporterEmail"
              type="email"
              maxLength={254}
              disabled={isPending}
              placeholder="Gerekirse size dönüş yapabilmemiz için"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`tool-link-report-details-${tool.id}`}>Açıklama (opsiyonel)</Label>
            <Textarea
              id={`tool-link-report-details-${tool.id}`}
              name="details"
              maxLength={1000}
              disabled={isPending}
              onChange={(event) => setDetailsLength(event.target.value.length)}
              placeholder="Örn: 404 veriyor, farklı ürüne yönlendiriyor veya güvenlik uyarısı çıkıyor."
              className="min-h-[120px]"
              aria-describedby={`tool-link-report-details-help-${tool.id}`}
            />
            <div id={`tool-link-report-details-help-${tool.id}`} className="flex justify-between text-xs text-muted-foreground">
              <span>Ek bilgi incelemeyi hızlandırır.</span>
              <span>{detailsLength}/1000</span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor…
                </>
              ) : (
                "Rapor Gönder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

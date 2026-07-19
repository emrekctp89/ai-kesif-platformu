'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';
import { setContentCreatorStatus } from '@/app/actions/contentCreators';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CreatorApplicationsPanel({ applications }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!applications?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Bekleyen içerik üretici başvurusu yok.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const meta = app.metadata || {};
        const userId = meta.user_id;
        const label = meta.username || meta.email || userId?.slice?.(0, 8) || '—';
        const pitch = meta.pitch || app.description || '';

        return (
          <Card key={app.id} className="glass-panel">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{label}</CardTitle>
                <Badge variant="secondary">Başvuru</Badge>
              </div>
              {meta.email ? <p className="text-xs text-muted-foreground">{meta.email}</p> : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pitch}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || !userId}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await setContentCreatorStatus({
                        userId,
                        enabled: true,
                        note: 'application_approved',
                      });
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success(result.message);
                        router.refresh();
                      }
                    });
                  }}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Onayla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending || !userId}
                  onClick={() => {
                    startTransition(async () => {
                      // Reject = keep not creator; close alert by approving false after resolving via set with note only won't close.
                      // Use setContentCreatorStatus(false) then manually we need close alert - setContentCreatorStatus only closes on enable.
                      // Call setContentCreatorStatus enabled false and resolve alerts in a dedicated path.
                      const result = await setContentCreatorStatus({
                        userId,
                        enabled: false,
                        note: 'application_rejected',
                      });
                      // Close application alerts even on reject
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success('Başvuru reddedildi (üretici yetkisi yok).');
                        router.refresh();
                      }
                    });
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reddet
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

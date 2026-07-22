'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { setContentCreatorStatus } from '@/app/actions/contentCreators';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CreatorApplicationsPanel({ applications }) {
  const t = useTranslations('AdminClient');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!applications?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('creatorAppsEmpty')}
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
                <Badge variant="secondary">{t('creatorAppsBadge')}</Badge>
              </div>
              {meta.email ? <p className="text-xs text-muted-foreground">{meta.email}</p> : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{pitch}</p>
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
                  {t('creatorAppsApprove')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending || !userId}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await setContentCreatorStatus({
                        userId,
                        enabled: false,
                        note: 'application_rejected',
                      });
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success(result.message || t('creatorAppsRejectedToast'));
                        router.refresh();
                      }
                    });
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  {t('creatorAppsReject')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

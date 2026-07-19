'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { requestContentCreatorAccess } from '@/app/actions/contentCreators';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CreatorApplyForm({ alreadyPending = false, labels }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(alreadyPending);

  if (done) {
    return (
      <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        {labels.pendingMessage}
      </p>
    );
  }

  return (
    <form
      className="mx-auto max-w-md space-y-3 text-left"
      action={(formData) => {
        startTransition(async () => {
          const result = await requestContentCreatorAccess(formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message || labels.pendingMessage);
          setDone(true);
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="creator-pitch">{labels.pitchLabel}</Label>
        <Textarea
          id="creator-pitch"
          name="pitch"
          required
          minLength={20}
          maxLength={800}
          placeholder={labels.pitchPlaceholder}
          className="min-h-[120px]"
          disabled={isPending}
        />
      </div>
      <Button type="submit" className="brand-gradient w-full" disabled={isPending}>
        {isPending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}

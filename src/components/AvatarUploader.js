'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

import { updateAvatar } from '@/app/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function AvatarUploader({ userId, currentAvatarUrl }) {
  const t = useTranslations('ProfileComponents');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const displayUrl = currentAvatarUrl ? `${currentAvatarUrl}?t=${new Date().getTime()}` : null;

  const handleFormSubmit = (formData) => {
    const file = formData.get('avatar');
    if (!file || file.size === 0) {
      toast.error(t('avatarPickError'));
      return;
    }

    startTransition(async () => {
      const result = await updateAvatar(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 border border-border/50 shadow-sm">
        <AvatarImage key={displayUrl} src={displayUrl} alt={t('avatarAlt')} />
        <AvatarFallback>{userId?.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <form action={handleFormSubmit}>
        <Label htmlFor="avatar-upload" className="cursor-pointer">
          <Button asChild variant="outline" className="min-h-10" disabled={isPending}>
            <span>{isPending ? t('avatarUploading') : t('avatarChange')}</span>
          </Button>
          <input
            type="file"
            id="avatar-upload"
            name="avatar"
            className="sr-only"
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => {
              const form = e.target.closest('form');
              if (form) {
                const formData = new FormData(form);
                handleFormSubmit(formData);
              }
            }}
            disabled={isPending}
          />
        </Label>
      </form>
    </div>
  );
}

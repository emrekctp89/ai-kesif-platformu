'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

import { updateUserProfile } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarUploader } from '@/components/AvatarUploader';
import { PushNotificationManager } from './PushNotificationManager';

export function ProfileEditor({ user, profile }) {
  const t = useTranslations('ProfileComponents');
  const [isPending, startTransition] = useTransition();

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await updateUserProfile(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  };

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle>{t('profileTitle')}</CardTitle>
        <CardDescription>{t('profileDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t('avatarLabel')}</Label>
          <AvatarUploader userId={user.id} currentAvatarUrl={profile?.avatar_url} />
        </div>

        <form action={handleFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('usernameLabel')}</Label>
            <Input
              id="username"
              name="username"
              defaultValue={profile?.username || ''}
              placeholder={t('usernamePlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('usernameHint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t('bioLabel')}</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile?.bio || ''}
              placeholder={t('bioPlaceholder')}
              maxLength={200}
            />
          </div>
          <div className="space-y-4 border-t border-border/60 pt-6">
            <Label className="font-semibold">{t('notificationsLabel')}</Label>
            <PushNotificationManager
              initialSubscriptionStatus={profile?.wants_push_notifications}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="brand-gradient min-h-10 shadow-md"
            >
              {isPending ? t('saving') : t('saveProfile')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

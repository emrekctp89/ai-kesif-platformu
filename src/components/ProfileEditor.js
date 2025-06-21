"use client";

import { useTransition } from "react";
import { updateUserProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AvatarUploader } from "@/components/AvatarUploader";
import toast from "react-hot-toast";

export function ProfileEditor({ user, profile }) {
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
    <Card>
      <CardHeader>
        <CardTitle>Genel Profil</CardTitle>
        <CardDescription>
          Herkese açık profil bilgilerinizi buradan güncelleyebilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Profil Fotoğrafı</Label>
          <AvatarUploader
            userId={user.id}
            currentAvatarUrl={profile?.avatar_url}
          />
        </div>

        <form action={handleFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı</Label>
            <Input
              id="username"
              name="username"
              defaultValue={profile?.username || ""}
              placeholder="benzersiz_kullanici_adiniz"
            />
            <p className="text-xs text-muted-foreground">
              Sadece küçük harf, sayı, - ve _ kullanabilirsiniz (3-15 karakter).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Hakkında (Bio)</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile?.bio || ""}
              placeholder="Kendinizden kısaca bahsedin..."
              maxLength="200"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Profili Güncelle"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

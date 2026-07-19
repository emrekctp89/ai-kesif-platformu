'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteUserFromAdmin } from '@/app/actions';
import { setContentCreatorStatus } from '@/app/actions/contentCreators';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { PenLine, Trash2 } from 'lucide-react';

function DeleteUserButton({ user, adminId }) {
  const isAdminItself = user.id === adminId;

  const handleFormAction = async (formData) => {
    const result = await deleteUserFromAdmin(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Kullanıcı başarıyla silindi.');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          disabled={isAdminItself}
          aria-label="Kullanıcıyı Sil"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. &quot;{user.email}&quot; kullanıcısı kalıcı olarak silinecektir.
            Bu kullanıcının tüm verileri (yorumlar, favoriler, eserler vb.) de kaybolacaktır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="userId" value={user.id} />
            <AlertDialogAction type="submit">Evet, Kullanıcıyı Sil</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreatorToggleButton({ user }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const enabled = Boolean(user.is_content_creator);

  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? 'secondary' : 'outline'}
      disabled={pending}
      className="gap-1"
      onClick={() => {
        startTransition(async () => {
          const result = await setContentCreatorStatus({
            userId: user.id,
            enabled: !enabled,
          });
          if (result.error) toast.error(result.error);
          else {
            toast.success(result.message || 'Güncellendi');
            router.refresh();
          }
        });
      }}
    >
      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
      {enabled ? 'Üretici' : 'Üretici yap'}
    </Button>
  );
}

export function UserManagementTable({ users, adminId }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kullanıcı</TableHead>
          <TableHead>İtibar</TableHead>
          <TableHead className="hidden md:table-cell">Rol</TableHead>
          <TableHead className="hidden md:table-cell">Yorum</TableHead>
          <TableHead className="hidden md:table-cell">Favori</TableHead>
          <TableHead className="hidden md:table-cell">Eser</TableHead>
          <TableHead className="hidden md:table-cell">Kayıt Tarihi</TableHead>
          <TableHead className="text-right">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="font-medium">{user.email}</div>
              </div>
            </TableCell>
            <TableCell className="font-bold">{user.reputation_points}</TableCell>
            <TableCell className="hidden md:table-cell">
              {user.is_content_creator ? (
                <Badge variant="secondary">İçerik üretici</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Üye</span>
              )}
            </TableCell>
            <TableCell className="hidden md:table-cell">{user.comment_count}</TableCell>
            <TableCell className="hidden md:table-cell">{user.favorite_count}</TableCell>
            <TableCell className="hidden md:table-cell">{user.showcase_count}</TableCell>
            <TableCell className="hidden md:table-cell">
              {new Date(user.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <CreatorToggleButton user={user} />
                <DeleteUserButton user={user} adminId={adminId} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

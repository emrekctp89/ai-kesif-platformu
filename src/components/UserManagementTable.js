"use client";

import * as React from "react";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { deleteUserFromAdmin } from "@/app/actions";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

function DeleteUserButton({ user, adminId }) {
  // Adminin kendi kendini silememesi için butonu devre dışı bırak
  const isAdminItself = user.id === adminId;

  const handleFormAction = async (formData) => {
    const result = await deleteUserFromAdmin(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Kullanıcı başarıyla silindi.");
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
            Bu işlem geri alınamaz. "{user.email}" kullanıcısı kalıcı olarak
            silinecektir. Bu kullanıcının tüm verileri (yorumlar, favoriler,
            eserler vb.) de kaybolacaktır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="userId" value={user.id} />
            <AlertDialogAction type="submit">
              Evet, Kullanıcıyı Sil
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UserManagementTable({ users, adminId }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kullanıcı</TableHead>
          <TableHead>İtibar</TableHead>
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
                  <AvatarFallback>
                    {user.email.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="font-medium">{user.email}</div>
              </div>
            </TableCell>
            <TableCell className="font-bold">
              {user.reputation_points}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {user.comment_count}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {user.favorite_count}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {user.showcase_count}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {new Date(user.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <DeleteUserButton user={user} adminId={adminId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

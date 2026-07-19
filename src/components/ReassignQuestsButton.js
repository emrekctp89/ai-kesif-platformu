'use client';

import { useTransition } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { reassignTodayDailyQuests } from '@/app/actions/quests';
import { Button } from '@/components/ui/button';

export function ReassignQuestsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await reassignTodayDailyQuests();
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            result.message ||
              `${result.assignedUsers || 0} kullanıcı için görevler yenilendi (${result.insertedRows || 0} satır).`
          );
          router.refresh();
        });
      }}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
      {isPending ? 'Yenileniyor…' : 'Bugünkü görevleri yeniden ata'}
    </Button>
  );
}

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { BulkImportClient } from '@/components/BulkImportClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Toplu İçe Aktarım | Operasyon Merkezi',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BulkImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/login');

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Toplu İçe Aktarım (Bulk Import)</h1>
      </div>

      <BulkImportClient />
    </div>
  );
}

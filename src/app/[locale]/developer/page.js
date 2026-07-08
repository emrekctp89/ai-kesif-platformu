import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { DeveloperPortalClient } from '@/components/DeveloperPortalClient';

export const metadata = {
  title: 'Geliştirici Portalı | AI Keşif Platformu',
  description: 'API anahtarlarınızı oluşturun ve yönetin.',
};

export default async function DeveloperPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/developer');
  }

  return (
    <div className="container mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Geliştirici Portalı</h1>
        <p className="text-muted-foreground mt-2">
          AI Keşif Platformu verilerine programatik olarak erişmek için API anahtarlarınızı yönetin.
        </p>
      </div>

      <DeveloperPortalClient />
    </div>
  );
}

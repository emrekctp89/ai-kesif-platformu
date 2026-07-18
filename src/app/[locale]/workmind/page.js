import { getTranslations } from 'next-intl/server';
import { WorkflowBuilder } from '@/components/workmind/WorkflowBuilder';

export const metadata = {
  title: 'Workmind | AI İş Akışı Oluşturucu',
  description: 'Yapay zeka araçlarıyla kendi iş akışınızı tasarlayın.',
};

export default async function WorkmindPage() {
  const t = await getTranslations('Common');

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Üst Bilgi Alanı */}
      <div className="px-6 py-4 border-b bg-card z-10 shrink-0">
        <h1 className="text-2xl font-extrabold text-primary flex items-center gap-2">
          🧠 Workmind{' '}
          <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
            BETA
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ne yapmak istediğinizi yazın, yapay zeka size en uygun araçlardan oluşan bir iş akışı
          (mindmap) çıkarsın.
        </p>
      </div>

      {/* Ana Harita Alanı */}
      <div className="flex-1 relative w-full h-full">
        <WorkflowBuilder />
      </div>
    </div>
  );
}

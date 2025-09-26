import { FeedbackDialog } from "@/components/FeedbackDialog";

export default function FeedbackPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Geri Bildirim</h1>
      <p className="text-muted-foreground mb-6">
        Platformla ilgili görüşlerinizi bizimle paylaşın.
      </p>

      {/* Modal component’i sayfa içinde açılıyor */}
      <FeedbackDialog />
    </div>
  );
}

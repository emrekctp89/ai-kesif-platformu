import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold">Sohbetlerinizi Görüntüleyin</h2>
      <p className="text-muted-foreground mt-2">
        Başlamak için lütfen soldaki menüden bir sohbet seçin veya bir
        kullanıcının profilinden yeni bir sohbet başlatın.
      </p>
    </div>
  );
}

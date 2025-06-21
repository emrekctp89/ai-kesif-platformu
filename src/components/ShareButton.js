import { ShareDialog } from "./ShareDialog";
import { Button } from "./ui/button";
import { Send } from "lucide-react";

export function ShareButton({ content }) {
  return (
    <ShareDialog sharedContent={content}>
      <Button variant="ghost" size="icon">
        <Send className="h-5 w-5" />
        <span className="sr-only">Mesajla Paylaş</span>
      </Button>
    </ShareDialog>
  );
}

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getToolDetailsForPreview } from '@/app/actions';
import { ExternalLink, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ToolPreviewDialog({ tool, isOpen, onClose }) {
  const [details, setDetails] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen && tool?.id) {
      setIsLoading(true);
      getToolDetailsForPreview(tool.id).then(result => {
        if (result?.success && result?.data) {
          setDetails(result.data);
        } else {
          setDetails(null);
        }
        setIsLoading(false);
      });
    }
  }, [isOpen, tool?.id]);

  const toolData = details?.tool;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
<DialogContent className="sm:max-w-2xl bg-gradient-to-br from-emerald-100 via-sky-100 to-violet-100 bg-opacity-60 backdrop-blur-md border border-muted shadow-md text-foreground">        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isLoading || !toolData ? 'Yükleniyor...' : toolData.name}
          </DialogTitle>
          {toolData && (
            <DialogDescription className="text-white/80">
              {toolData.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {toolData && (
  <div className="grid gap-6 py-4">
    {/* Avatar + Marka Bilgisi */}
    {(toolData.logo_url || toolData.creator_name) && (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={toolData.logo_url} alt={toolData.name} />
          <AvatarFallback>{toolData.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{toolData.name}</p>
          {toolData.creator_name && (
            <p className="text-sm text-muted-foreground">by {toolData.creator_name}</p>
          )}
        </div>
      </div>
    )}

    {/* Platformlar */}
    {toolData.platforms?.length > 0 && (
      <div className="flex gap-2 flex-wrap">
        {toolData.platforms.map((platform, index) => (
          <Badge key={index} variant="secondary">{platform}</Badge>
        ))}
      </div>
    )}

    {/* Etiketler */}
    {toolData.tags?.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {toolData.tags.map(tag => (
          <Badge key={tag.id} variant="outline">{tag.name}</Badge>
        ))}
      </div>
    )}

    {/* Kategori Açıklaması */}
    {toolData.category_description && (
      <div className="text-sm text-muted-foreground">
        <p><strong>Kategori:</strong> {toolData.category_name}</p>
        <p className="mt-1">{toolData.category_description}</p>
      </div>
    )}

    {/* Benzer Araçlar */}
    {toolData.similar_tools?.length > 0 && (
      <div>
        <p className="text-sm text-muted-foreground mb-2">Benzer araçlar:</p>
        <div className="flex flex-wrap gap-2">
          {toolData.similar_tools.map(similar => (
            <Badge key={similar.id} variant="outline">{similar.name}</Badge>
          ))}
        </div>
      </div>
    )}

    {/* Butonlar */}
    <div className="flex justify-end gap-2 pt-2">
      <Button
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText(toolData.link);
          toast.success("Bağlantı panoya kopyalandı!");
        }}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Paylaş
      </Button>
      <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
        <a href={toolData.link} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4 mr-2" />
          Hemen Dene
        </a>
      </Button>
    </div>
  </div>
)}     </DialogContent>
    </Dialog>
  );
}
'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Star, MessageSquare, Sparkles, ExternalLink, Heart } from 'lucide-react';
import { ToolCardSkeleton } from './ToolCardSkeleton';

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isLoading || !toolData ? 'Yükleniyor...' : toolData.name}
          </DialogTitle>
          {toolData && (
            <DialogDescription>{toolData.description}</DialogDescription>
          )}
        </DialogHeader>

        {toolData && (
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 text-sm">
              </div>
              <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                <a href={toolData.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Hemen Dene
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 
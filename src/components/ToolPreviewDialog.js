'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getToolDetailsForPreview } from "@/app/actions"
import { Star, MessageSquare, Sparkles } from 'lucide-react'

export function ToolPreviewDialog({ tool, isOpen, onClose }) {
  const [details, setDetails] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getToolDetailsForPreview(tool.id).then(result => {
        if (result.success) {
          setDetails(result.data)
        }
        setIsLoading(false)
      })
    }
  }, [isOpen, tool.id])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        {/* DialogHeader ve DialogTitle her zaman render edilmeli */}
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isLoading || !details ? "Yükleniyor..." : details.tool.name}
          </DialogTitle>
          {!isLoading && details && (
            <DialogDescription>{details.tool.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* İçerik yükleniyorsa spinner göster */}
        {isLoading || !details ? (
          <div className="h-96 flex items-center justify-center">Yükleniyor...</div>
        ) : (
          <>
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold">
                    {details.tool.average_rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({details.tool.total_ratings} oy)
                  </span>
                </div>
                <Button asChild>
                  <a
                    href={details.tool.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Web Sitesini Ziyaret Et
                  </a>
                </Button>
              </div>

              {details.comments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Topluluk Yorumları
                  </h4>
                  <div className="space-y-3">
                    {details.comments.map((comment, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-md"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={comment.profiles?.avatar_url} />
                          <AvatarFallback>
                            {comment.profiles?.username?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="italic">&quot;{comment.content}&quot;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {details.prompts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Popüler Prompt'lar
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {details.prompts.map((prompt, i) => (
                      <Badge key={i} variant="outline">
                        {prompt.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center pt-4 border-t">
              <Button asChild variant="link">
                <Link href={`/tool/${details.tool.slug}`}>
                  Tüm Detayları Gör & Yorum Yap
                </Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

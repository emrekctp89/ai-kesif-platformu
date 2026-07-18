'use client';

import React, { useEffect, useState } from 'react';
import { getToolsByCategorySlug } from '@/app/actions/workmind';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function NodeSidebar({ node, onClose }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (node?.data?.raw?.categorySlug) {
      setLoading(true);
      getToolsByCategorySlug(node.data.raw.categorySlug)
        .then((res) => {
          setTools(res || []);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setTools([]);
    }
  }, [node]);

  if (!node) return null;

  const raw = node.data?.raw;

  return (
    <div className="w-80 h-full bg-card border-l shadow-2xl flex flex-col transition-all shrink-0 z-20">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold text-lg line-clamp-1">{raw?.label || 'Detaylar'}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{raw?.description}</p>
          {raw?.categorySlug && (
            <Badge variant="secondary" className="mt-2">
              Kategori: {raw.categorySlug}
            </Badge>
          )}
        </div>

        <h4 className="font-semibold text-sm mb-3 text-primary uppercase tracking-wider">
          Önerilen Araçlar
        </h4>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tools.length > 0 ? (
          <div className="space-y-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="p-3 border rounded-lg hover:border-primary/50 bg-background transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {tool.name}
                    </h5>
                    {tool.tier && (
                      <Badge
                        variant={tool.tier === 'Sponsorlu' ? 'default' : 'secondary'}
                        className="text-[10px] px-1 py-0 h-4 mt-1"
                      >
                        {tool.tier}
                      </Badge>
                    )}
                  </div>
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Link href={`/tool/${tool.slug}`} target="_blank">
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
            Bu adıma uygun araç bulunamadı veya eşleştirilemedi.
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, FlaskConical, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getToolsByCategorySlug } from '@/app/actions/workmind';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function NodeSidebar({ node, onClose }) {
  const t = useTranslations('Workmind');
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
    <aside className="z-20 flex h-full w-80 shrink-0 flex-col border-l bg-card shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug">
          {raw?.label || t('details')}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('close')}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <p className="text-sm leading-relaxed text-muted-foreground">{raw?.description}</p>
          {raw?.categorySlug ? (
            <Badge variant="secondary" className="mt-2 font-medium">
              {raw.categorySlug}
            </Badge>
          ) : null}
        </div>

        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-100">
          <span className="inline-flex items-center gap-1 font-semibold">
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            {t('betaBadge')}
          </span>
          <p className="mt-1 opacity-90">{t('sidebarBetaNote')}</p>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
            {t('suggestedTools')}
          </h4>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tools.length > 0 ? (
            <div className="space-y-3">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="group rounded-lg border bg-background p-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-sm font-semibold transition-colors group-hover:text-primary">
                        {tool.name}
                      </h5>
                      {tool.tier ? (
                        <Badge
                          variant={tool.tier === 'Sponsorlu' ? 'default' : 'secondary'}
                          className="mt-1 h-4 px-1 py-0 text-[10px]"
                        >
                          {tool.tier}
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      asChild
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
                    >
                      <Link href={`/tool/${tool.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="sr-only">{t('openTool')}</span>
                      </Link>
                    </Button>
                  </div>
                  {tool.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  ) : null}
                  {tool.pricing_model ? (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {tool.pricing_model}
                      {Array.isArray(tool.platforms) && tool.platforms.length
                        ? ` · ${tool.platforms.slice(0, 3).join(', ')}`
                        : ''}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              {t('noTools')}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

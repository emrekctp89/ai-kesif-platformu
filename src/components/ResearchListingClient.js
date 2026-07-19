'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Building, ExternalLink, Search, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function PaperCard({ paper, t }) {
  const authors = Array.isArray(paper.authors) ? paper.authors : [];
  const authorNames = authors
    .map((a) => a?.name)
    .filter(Boolean)
    .join(', ');
  const institutions = [...new Set(authors.map((a) => a?.institution).filter(Boolean))].join(', ');
  const year =
    paper.publication_year ||
    paper.year ||
    (paper.published_at ? new Date(paper.published_at).getFullYear() : null);
  const href = paper.paper_doi_url || paper.doi_url || null;
  const title = paper.paper_title || paper.title || t('untitledPaper');
  const summary = paper.paper_summary || paper.summary || '';

  return (
    <Card className="glass-panel border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-semibold">
            {t('paperBadge')}
          </Badge>
          {year ? <span className="text-xs font-medium text-muted-foreground">{year}</span> : null}
          {authors.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t('authorCount', { count: authors.length })}
            </span>
          ) : null}
        </div>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CardTitle className="text-lg leading-snug group-hover:text-primary sm:text-xl">
              {title}
              <ArrowUpRight
                className="ml-1 inline h-4 w-4 align-text-top opacity-60 transition group-hover:opacity-100"
                aria-hidden="true"
              />
            </CardTitle>
          </a>
        ) : (
          <CardTitle className="text-lg leading-snug sm:text-xl">{title}</CardTitle>
        )}

        {summary ? (
          <CardDescription className="line-clamp-3 text-sm leading-relaxed">
            {summary}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        {authorNames ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground/80">{t('authors')}: </span>
              {authorNames}
            </span>
          </div>
        ) : null}
        {institutions ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Building className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground/80">{t('institutions')}: </span>
              {institutions}
            </span>
          </div>
        ) : null}

        {href ? (
          <div className="pt-1">
            <Button asChild size="sm" variant="outline" className="glass-button">
              <a href={href} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('readFullPaper')}
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ papers: Array }} props
 */
export function ResearchListingClient({ papers }) {
  const t = useTranslations('ResearchPage');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return papers || [];
    return (papers || []).filter((paper) => {
      const authors = Array.isArray(paper.authors) ? paper.authors : [];
      const authorText = authors.map((a) => `${a?.name || ''} ${a?.institution || ''}`).join(' ');
      const hay = `${paper.paper_title || paper.title || ''} ${
        paper.paper_summary || paper.summary || ''
      } ${authorText}`.toLocaleLowerCase('tr-TR');
      return hay.includes(q);
    });
  }, [papers, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t('resultsCount', { count: filtered.length })}
        </p>
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPapers')}
            className="min-h-10 pl-9"
            aria-label={t('searchPapers')}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">
            {query ? t('noResultsTitle') : t('emptyTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {query ? t('noResultsBody') : t('emptyBody')}
          </p>
          {query ? (
            <Button type="button" variant="outline" className="mt-5" onClick={() => setQuery('')}>
              {t('clearSearch')}
            </Button>
          ) : null}
        </section>
      ) : (
        <div className="space-y-4">
          {filtered.map((paper) => (
            <PaperCard
              key={paper.paper_id || paper.id || paper.paper_title || paper.title}
              paper={paper}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

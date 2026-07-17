'use client';

import { useTranslations } from 'next-intl';
import { Users, Building, FileText } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function AcademicBackground({ papers }) {
  const t = useTranslations('ResearchPage');

  if (!papers || papers.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-2 text-sm font-medium text-foreground">{t('emptyToolTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('emptyToolBody')}</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {papers.map((paper) => (
        <AccordionItem key={paper.id} value={`item-${paper.id}`}>
          <AccordionTrigger>{paper.title}</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm italic text-muted-foreground">{paper.summary}</p>

            {paper.authors ? (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {t('authors')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {paper.authors.map((author) => (
                    <div key={author.id} className="rounded-md bg-muted p-2 text-xs">
                      <p className="font-medium">{author.name}</p>
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Building className="h-3 w-3" aria-hidden="true" />
                        {author.institution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <a
              href={paper.doi_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {t('readFullPaper')}
            </a>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

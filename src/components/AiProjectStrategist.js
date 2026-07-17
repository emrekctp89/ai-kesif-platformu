'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Bot, Lightbulb, CheckCircle } from 'lucide-react';

import { getAiProjectStrategy } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AiProjectStrategist({ projectId }) {
  const t = useTranslations('ProfileComponents');
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = React.useState(null);

  const handleAnalysisRequest = () => {
    startTransition(async () => {
      setAnalysis(null);
      const result = await getAiProjectStrategy(projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAnalysis(result.data);
        toast.success(t('analysisComplete'));
      }
    });
  };

  return (
    <Card className="border-dashed border-border/60 bg-muted/40 glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" aria-hidden="true" />
          {t('aiStrategistTitle')}
        </CardTitle>
        <CardDescription>{t('aiStrategistDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          type="button"
          onClick={handleAnalysisRequest}
          disabled={isPending}
          className="min-h-10 w-full brand-gradient shadow-md"
        >
          {isPending ? t('analyzing') : t('generateStrategy')}
        </Button>

        {analysis ? (
          <div className="animate-in fade-in-50 space-y-4 border-t border-border/50 pt-4">
            {analysis.project_summary ? (
              <div>
                <h4 className="mb-2 font-semibold">{t('projectSummary')}</h4>
                <p className="text-sm text-muted-foreground">{analysis.project_summary}</p>
              </div>
            ) : null}
            {analysis.strategic_suggestions?.length > 0 ? (
              <div>
                <h4 className="mb-2 font-semibold">{t('strategicSuggestions')}</h4>
                <ul className="space-y-2">
                  {analysis.strategic_suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb
                        className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500"
                        aria-hidden="true"
                      />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analysis.potential_tools?.length > 0 ? (
              <div>
                <h4 className="mb-2 font-semibold">{t('potentialTools')}</h4>
                <ul className="space-y-2">
                  {analysis.potential_tools.map((tool, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                        aria-hidden="true"
                      />
                      <span>{tool}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

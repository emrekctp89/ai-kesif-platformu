'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { getAiComparison } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, CheckCircle, LoaderCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function AiComparison({ tools }) {
  const t = useTranslations('Compare');
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = React.useState(null);

  // Reset analysis when tool set changes
  const toolKey = (tools || []).map((tool) => tool.slug || tool.id).join(',');
  React.useEffect(() => {
    setAnalysisResult(null);
  }, [toolKey]);

  const handleCompareClick = () => {
    startTransition(async () => {
      const result = await getAiComparison(tools);
      if (result.error) {
        toast.error(result.error);
        setAnalysisResult(null);
      } else {
        setAnalysisResult(result.data);
      }
    });
  };

  const canAnalyze = (tools?.length || 0) >= 2;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button
          onClick={handleCompareClick}
          disabled={isPending || !canAnalyze}
          size="lg"
          className="ai-tavsiye-gradient min-h-12 rounded-2xl px-6 font-semibold shadow-md"
        >
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {t('aiAnalyzing')}
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('aiButton')}
            </>
          )}
        </Button>
        {!canAnalyze ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('aiNeedTwo')}</p>
        ) : null}
      </div>

      {analysisResult ? (
        <Card className="glass-panel border-border/50 bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('aiTitle')}
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              {analysisResult.comparison_summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {(analysisResult.detailed_analysis || []).map((tool) => (
              <div
                key={tool.tool_name}
                className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-4"
              >
                <h3 className="text-lg font-bold">{tool.tool_name}</h3>
                <p className="text-sm leading-6">
                  <span className="font-semibold">{t('aiBestFor')}:</span> {tool.best_for}
                </p>
                <div>
                  <h4 className="mb-2 font-semibold">{t('aiPros')}</h4>
                  <ul className="space-y-1.5">
                    {(tool.pros || []).map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-5">
                        <CheckCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">{t('aiCons')}</h4>
                  <ul className="space-y-1.5">
                    {(tool.cons || []).map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-5">
                        <XCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

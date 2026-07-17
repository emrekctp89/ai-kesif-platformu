'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { bulkImportTools } from '@/app/actions/bulk';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BulkImportClient() {
  const t = useTranslations('BulkImport');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error(t('emptyError'));
      return;
    }

    setLoading(true);
    setResults(null);
    const result = await bulkImportTools(jsonInput);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      setResults(result);
      if (!result.errors) {
        setJsonInput('');
      }
    }
  };

  const sampleJson = `[
  {
    "name": "Yeni AI Aracı",
    "description": "Harika bir araç.",
    "website_url": "https://example.com",
    "pricing_type": "freemium"
  }
]`;

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 rounded-xl bg-muted p-3 font-mono text-xs">
            <p className="mb-2 text-muted-foreground">{t('sampleLabel')}</p>
            <pre>{sampleJson}</pre>
          </div>

          <Textarea
            placeholder="[ { ... } ]"
            className="min-h-[300px] font-mono"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />

          <Button
            onClick={handleImport}
            disabled={loading}
            className="brand-gradient w-full min-h-11 shadow-md sm:w-auto"
          >
            {loading ? t('importing') : t('importButton')}
          </Button>

          {results ? (
            <div className="mt-6 rounded-xl border border-border/50 p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                {t('resultTitle', { message: results.message })}
              </h3>
              {results.errors && results.errors.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <h4 className="flex items-center gap-2 font-semibold text-red-500">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {t('errorsTitle', { count: results.errors.length })}
                  </h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

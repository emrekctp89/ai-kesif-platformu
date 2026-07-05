'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { bulkImportTools } from '@/app/actions/bulk';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function BulkImportClient() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Lütfen eklenecek JSON verisini girin.');
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
        setJsonInput(''); // Clear on full success
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
      <Card>
        <CardHeader>
          <CardTitle>JSON İçe Aktarım</CardTitle>
          <CardDescription>
            Aşağıdaki metin kutusuna JSON formatında bir liste yapıştırın. Toplu olarak tüm araçlar
            veritabanına eklenecektir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded-md text-xs font-mono mb-4">
            <p className="text-muted-foreground mb-2">Örnek Format:</p>
            <pre>{sampleJson}</pre>
          </div>

          <Textarea
            placeholder="[ { ... } ]"
            className="font-mono min-h-[300px]"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />

          <Button onClick={handleImport} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'İçe Aktarılıyor...' : 'Toplu Araç Ekle'}
          </Button>

          {results && (
            <div className="mt-6 p-4 border rounded-md">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> Sonuç: {results.message}
              </h3>
              {results.errors && results.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-red-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Hatalı Kayıtlar ({results.errors.length}):
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

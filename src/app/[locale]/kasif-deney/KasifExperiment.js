'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function KasifExperiment() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/kasif/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      setResult(response.ok ? data : { error: data.error || 'Bir hata oluştu.' });
    } catch {
      setResult({ error: 'Kâşif sunucusuna ulaşılamadı.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-6 px-4 py-12">
      <div>
        <p className="text-sm font-medium text-primary">Yerel AI kalite deneyi</p>
        <h1 className="text-3xl font-bold">Kâşif</h1>
        <p className="mt-2 text-muted-foreground">
          Yalnızca platformdaki onaylı araç kayıtlarından yanıt verir.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={800}
          rows={4}
          className="w-full rounded-lg border bg-background p-3"
          placeholder="Örneğin: Ücretsiz sunum hazırlamak için hangi araçları kullanabilirim?"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Kâşif düşünüyor…' : 'Kâşif’e sor'}
        </button>
      </form>

      {result && (
        <section className="rounded-xl border bg-card p-5">
          {result.error ? (
            <p className="text-destructive">{result.error}</p>
          ) : (
            <>
              <p className="whitespace-pre-wrap">{result.answer}</p>
              {result.sources?.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <p className="mb-2 text-sm font-semibold">Platform kaynakları</p>
                  <ul className="space-y-1">
                    {result.sources.map((source) => (
                      <li key={source.id}>
                        <Link className="text-primary underline" href={source.url}>
                          {source.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}

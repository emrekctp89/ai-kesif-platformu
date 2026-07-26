'use client';

import logger from '@/utils/logger';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateApiKey, getApiKeys, revokeApiKey } from '@/app/actions/api-keys';
import { toast } from 'sonner';
import {
  Copy,
  Trash2,
  Key,
  AlertCircle,
  Sparkles,
  BookOpen,
  Play,
  Loader2,
  FlaskConical,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { V1_RATE_LIMIT_PER_MINUTE } from '@/lib/developerApi';

const SANDBOX_STORAGE_KEY = 'aikesif.dev.sandboxApiKey';

const SANDBOX_MODES = [
  { id: 'tools', labelKey: 'sandboxModeTools' },
  { id: 'detail', labelKey: 'sandboxModeDetail' },
  { id: 'kasif', labelKey: 'sandboxModeKasif' },
];

function resolveApiBase() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://www.aikesif.com';
}

function readStoredSandboxKey() {
  try {
    if (typeof window === 'undefined') return '';
    return String(sessionStorage.getItem(SANDBOX_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

function writeStoredSandboxKey(value) {
  try {
    if (typeof window === 'undefined') return;
    const next = String(value || '').trim();
    if (!next) sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    else sessionStorage.setItem(SANDBOX_STORAGE_KEY, next);
  } catch {
    // private mode / blocked storage
  }
}

export function DeveloperPortalClient() {
  const t = useTranslations('DeveloperPage');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const lang = locale === 'en' ? 'en' : 'tr';

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newRawKey, setNewRawKey] = useState(null);

  // Sandbox state
  const [sandboxKey, setSandboxKey] = useState('');
  const [sandboxMode, setSandboxMode] = useState('kasif');
  const [sandboxQ, setSandboxQ] = useState('');
  const [sandboxSlug, setSandboxSlug] = useState('chatgpt');
  const [sandboxQuestion, setSandboxQuestion] = useState(
    lang === 'en' ? 'free AI tools for presentations' : 'sunum için ücretsiz AI araçları'
  );
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [sandboxResult, setSandboxResult] = useState(null);

  const apiBase = useMemo(() => resolveApiBase(), []);

  const toolsCurl = useMemo(
    () =>
      `curl -X GET "${apiBase}/api/v1/tools?page=1&limit=10&q=image" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    [apiBase]
  );

  const toolDetailCurl = useMemo(
    () =>
      `curl -X GET "${apiBase}/api/v1/tools/chatgpt" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    [apiBase]
  );

  const kasifCurl = useMemo(
    () =>
      `curl -X POST "${apiBase}/api/v1/kasif/recommend" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"${lang === 'en' ? 'free AI tools for presentations' : 'sunum için ücretsiz AI araçları'}","limit":5,"locale":"${lang}"}'`,
    [apiBase, lang]
  );

  const openApiUrl = useMemo(() => `${apiBase}/api/v1/openapi`, [apiBase]);

  useEffect(() => {
    setSandboxKey(readStoredSandboxKey());
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  const applySandboxKey = useCallback((raw) => {
    const value = String(raw || '').trim();
    setSandboxKey(value);
    writeStoredSandboxKey(value);
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await getApiKeys();
      if (error) {
        toast.error(error);
      } else if (data) {
        setKeys(data);
      }
    } catch (err) {
      logger.error('fetchKeys failed:', err);
      toast.error(t('unexpectedError') + (err?.message ? `: ${err.message}` : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error(t('keyNameRequired'));
      return;
    }
    setGenerating(true);
    try {
      const { data, rawKey, error } = await generateApiKey(newKeyName.trim());
      if (error) {
        toast.error(error);
      } else if (data && rawKey) {
        setNewRawKey(rawKey);
        setNewKeyName('');
        setKeys([data, ...keys]);
      }
    } catch (err) {
      logger.error('handleGenerate failed:', err);
      toast.error(t('serverError') + (err?.message ? `: ${err.message}` : ''));
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm(t('revokeConfirm'))) return;

    try {
      const { success, error } = await revokeApiKey(id);
      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success(t('revokeSuccess'));
        setKeys(keys.filter((k) => k.id !== id));
      }
    } catch (err) {
      logger.error('handleRevoke failed:', err);
      toast.error(t('serverError') + (err?.message ? `: ${err.message}` : ''));
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('copied'));
    } catch {
      toast.error(t('unexpectedError'));
    }
  };

  const runSandbox = async () => {
    const key = sandboxKey.trim();
    if (!key.startsWith('aik_')) {
      toast.error(t('sandboxKeyRequired'));
      return;
    }

    writeStoredSandboxKey(key);
    setSandboxBusy(true);
    setSandboxResult(null);
    const started = performance.now();

    try {
      let url = '';
      let init = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      };

      if (sandboxMode === 'tools') {
        const params = new URLSearchParams({ page: '1', limit: '5' });
        if (sandboxQ.trim()) params.set('q', sandboxQ.trim().slice(0, 120));
        url = `${apiBase}/api/v1/tools?${params.toString()}`;
      } else if (sandboxMode === 'detail') {
        const slug = sandboxSlug.trim().toLowerCase();
        if (!slug) {
          toast.error(t('sandboxSlugRequired'));
          setSandboxBusy(false);
          return;
        }
        url = `${apiBase}/api/v1/tools/${encodeURIComponent(slug)}`;
      } else {
        url = `${apiBase}/api/v1/kasif/recommend`;
        init = {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: sandboxQuestion.trim(),
            limit: 5,
            locale: lang,
          }),
        };
        if (sandboxQuestion.trim().length < 3) {
          toast.error(t('sandboxQuestionRequired'));
          setSandboxBusy(false);
          return;
        }
      }

      const response = await fetch(url, init);
      const elapsedMs = Math.round(performance.now() - started);
      let body;
      const text = await response.text();
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text };
      }

      setSandboxResult({
        ok: response.ok,
        status: response.status,
        elapsedMs,
        body,
        path:
          sandboxMode === 'kasif'
            ? 'POST /api/v1/kasif/recommend'
            : sandboxMode === 'detail'
              ? `GET /api/v1/tools/${sandboxSlug.trim()}`
              : 'GET /api/v1/tools',
      });

      if (!response.ok) {
        toast.error(t('sandboxRequestFailed', { status: response.status }));
      }
    } catch (err) {
      logger.error('sandbox request failed:', err);
      toast.error(t('serverError') + (err?.message ? `: ${err.message}` : ''));
      setSandboxResult({
        ok: false,
        status: 0,
        elapsedMs: Math.round(performance.now() - started),
        body: { error: err?.message || 'network_error' },
        path: sandboxMode,
      });
    } finally {
      setSandboxBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('docsTitle')}
          </CardTitle>
          <CardDescription>{t('docsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-semibold">{t('authHeaderLabel')}</p>
            <pre className="overflow-x-auto rounded border bg-card p-3 text-sm">
              <code>Authorization: Bearer aik_…</code>
            </pre>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="mb-1 text-sm font-semibold">{t('openApiTitle')}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t('openApiNote')}</p>
            <pre className="overflow-x-auto rounded border bg-card p-3 text-sm">
              <code>{`curl -X GET "${openApiUrl}"`}</code>
            </pre>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href={openApiUrl} target="_blank" rel="noopener noreferrer">
                  {t('openApiOpen')}
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(`curl -X GET "${openApiUrl}"`)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {t('copied')}
              </Button>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="mb-1 text-sm font-semibold">{t('exampleToolsTitle')}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t('exampleToolsNote')}</p>
            <pre className="overflow-x-auto rounded border bg-card p-3 text-sm">
              <code>{toolsCurl}</code>
            </pre>
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(toolsCurl)}>
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {t('copied')}
              </Button>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="mb-1 text-sm font-semibold">{t('exampleToolDetailTitle')}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t('exampleToolDetailNote')}</p>
            <pre className="overflow-x-auto rounded border bg-card p-3 text-sm">
              <code>{toolDetailCurl}</code>
            </pre>
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(toolDetailCurl)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {t('copied')}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-primary/25 bg-primary/5 p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{t('exampleKasifTitle')}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {t('kasifBadge')}
              </span>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{t('exampleKasifNote')}</p>
            <pre className="overflow-x-auto rounded border bg-card p-3 text-sm">
              <code>{kasifCurl}</code>
            </pre>
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(kasifCurl)}>
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {t('copied')}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-orange-100 p-3 text-sm text-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{t('rateLimitTitle')}</p>
              <p>{t('rateLimitBody', { limit: V1_RATE_LIMIT_PER_MINUTE })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
            {t('sandboxTitle')}
          </CardTitle>
          <CardDescription>{t('sandboxDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sandbox-key">{t('sandboxKeyLabel')}</Label>
            <Input
              id="sandbox-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="aik_…"
              value={sandboxKey}
              onChange={(e) => setSandboxKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('sandboxKeyHint')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SANDBOX_MODES.map((mode) => (
              <Button
                key={mode.id}
                type="button"
                size="sm"
                variant={sandboxMode === mode.id ? 'default' : 'outline'}
                onClick={() => setSandboxMode(mode.id)}
              >
                {mode.id === 'kasif' ? (
                  <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                {t(mode.labelKey)}
              </Button>
            ))}
          </div>

          {sandboxMode === 'tools' ? (
            <div className="space-y-2">
              <Label htmlFor="sandbox-q">{t('sandboxQLabel')}</Label>
              <Input
                id="sandbox-q"
                value={sandboxQ}
                onChange={(e) => setSandboxQ(e.target.value)}
                placeholder={t('sandboxQPlaceholder')}
                maxLength={120}
              />
            </div>
          ) : null}

          {sandboxMode === 'detail' ? (
            <div className="space-y-2">
              <Label htmlFor="sandbox-slug">{t('sandboxSlugLabel')}</Label>
              <Input
                id="sandbox-slug"
                value={sandboxSlug}
                onChange={(e) => setSandboxSlug(e.target.value)}
                placeholder="chatgpt"
                maxLength={120}
              />
            </div>
          ) : null}

          {sandboxMode === 'kasif' ? (
            <div className="space-y-2">
              <Label htmlFor="sandbox-question">{t('sandboxQuestionLabel')}</Label>
              <Textarea
                id="sandbox-question"
                value={sandboxQuestion}
                onChange={(e) => setSandboxQuestion(e.target.value)}
                className="min-h-[88px]"
                maxLength={800}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runSandbox} disabled={sandboxBusy}>
              {sandboxBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {sandboxBusy ? t('sandboxRunning') : t('sandboxRun')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                applySandboxKey('');
                setSandboxResult(null);
              }}
              disabled={sandboxBusy}
            >
              {t('sandboxClear')}
            </Button>
          </div>

          {sandboxResult ? (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    sandboxResult.ok
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  HTTP {sandboxResult.status || '—'}
                </span>
                <span className="text-muted-foreground">{sandboxResult.path}</span>
                <span className="text-muted-foreground">{sandboxResult.elapsedMs} ms</span>
              </div>
              <pre className="max-h-80 overflow-auto rounded border bg-card p-3 text-xs leading-relaxed">
                <code>{JSON.stringify(sandboxResult.body, null, 2)}</code>
              </pre>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopy(JSON.stringify(sandboxResult.body, null, 2))
                  }
                >
                  <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {t('copied')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('createKeyTitle')}</CardTitle>
          <CardDescription>{t('createKeyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleGenerate}
            className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <label htmlFor="keyName" className="text-sm font-medium">
                {t('keyNameLabel')}
              </label>
              <Input
                id="keyName"
                placeholder={t('keyNamePlaceholder')}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={50}
              />
            </div>
            <Button type="submit" disabled={generating}>
              {generating ? t('creatingKey') : t('createKey')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('listTitle')}</CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t('loading')}</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground">{t('emptyKeys')}</p>
          ) : (
            <div className="space-y-4">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <Key className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{k.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('createdAt', {
                          date: new Date(k.created_at).toLocaleDateString(dateLocale),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right text-xs text-muted-foreground sm:block">
                      {k.last_used_at
                        ? t('lastUsed', {
                            date: new Date(k.last_used_at).toLocaleDateString(dateLocale),
                          })
                        : t('neverUsed')}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(k.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('revoke')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!newRawKey} onOpenChange={(open) => !open && setNewRawKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" aria-hidden="true" /> {t('dialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('dialogBody')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2 rounded-md bg-muted p-3">
              <code className="flex-1 break-all text-sm">{newRawKey}</code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(newRawKey)}
                aria-label={t('copied')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 rounded-md bg-orange-100 p-3 text-sm text-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{t('dialogWarn')}</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setNewRawKey(null)}>
              {t('dialogClose')}
            </Button>
            <Button
              onClick={() => {
                applySandboxKey(newRawKey);
                setNewRawKey(null);
                setSandboxMode('kasif');
                toast.success(t('sandboxKeyLoaded'));
              }}
            >
              <FlaskConical className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('dialogUseInSandbox')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

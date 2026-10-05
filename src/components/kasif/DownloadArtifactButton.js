'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function DownloadArtifactButton({ text, packId }) {
  const t = useTranslations('Kasif');
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (typeof text !== 'string' || !text.trim()) return;
    let nextUrl;
    try {
      nextUrl = URL.createObjectURL(
        new Blob(['\ufeff', text], { type: 'text/plain;charset=utf-8' })
      );
      setUrl(nextUrl);
    } catch {
      setFailed(true);
    }
    return () => {
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [text]);

  if (failed)
    return (
      <span role="status" className="text-xs text-muted-foreground">
        {t('packs.downloadFailed')}
      </span>
    );
  if (!url) return null;
  const filename = `kasif-${String(packId || 'paket').replace(/[^a-z0-9-]/gi, '')}.txt`;
  return (
    <a
      href={url}
      download={filename}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium hover:bg-muted"
    >
      <Download className="h-3 w-3" aria-hidden="true" />
      {t('packs.downloadArtifact')}
    </a>
  );
}

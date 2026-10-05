'use client';

import { useState } from 'react';
import { Check, Copy, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CopyAnswerButton({ answer }) {
  const t = useTranslations('Kasif');
  const [status, setStatus] = useState('idle');

  async function copyAnswer() {
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(answer);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  if (typeof answer !== 'string' || !answer.trim()) return null;
  const Icon = status === 'copied' ? Check : status === 'copying' ? LoaderCircle : Copy;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyAnswer}
        disabled={status === 'copying'}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {t(status === 'copied' ? 'answerCopied' : 'copyAnswer')}
      </button>
      <span role="status" className="text-xs text-muted-foreground">
        {status === 'copied' ? t('answerCopied') : status === 'error' ? t('copyAnswerError') : ''}
      </span>
    </div>
  );
}

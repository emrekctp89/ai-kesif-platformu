'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, BookOpen, Map, Search } from 'lucide-react';

export default function LearningResources({ guides = [], paths = [] }) {
  const t = useTranslations('LearnStudio');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [limit, setLimit] = useState(6);
  const resources = [
    ...guides.map((item) => ({ ...item, kind: 'guide', href: `/blog/${item.slug}` })),
    ...paths.map((item) => ({ ...item, kind: 'path', href: `/koleksiyonlar/${item.slug}` })),
  ];
  const normalize = (s) =>
    String(s || '')
      .toLocaleLowerCase('tr-TR')
      .replaceAll('ı', 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = resources.filter(
    (item) =>
      (type === 'all' || item.kind === type) &&
      terms.every((term) => normalize(`${item.title} ${item.description || ''}`).includes(term))
  );

  return (
    <section
      id="learning-resources"
      aria-labelledby="learning-resources-heading"
      className="scroll-mt-24 space-y-5"
    >
      <div>
        <h2 id="learning-resources-heading" className="text-2xl font-bold sm:text-3xl">
          {t('resourcesTitle')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('resourcesBody')}</p>
        {locale === 'en' && (
          <p className="mt-2 text-xs text-muted-foreground">{t('originalLanguage')}</p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t('resourceSearch')}</span>
          <Search
            className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(6);
            }}
            placeholder={t('resourceSearch')}
            className="min-h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">{t('resourceType')}</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setLimit(6);
            }}
            className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm sm:w-48"
          >
            <option value="all">{t('allResources')}</option>
            <option value="guide">{t('guide')}</option>
            <option value="path">{t('path')}</option>
          </select>
        </label>
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {t('resourceCount', { count: filtered.length })}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, limit).map((item) => (
          <article
            key={`${item.kind}:${item.slug}`}
            className="flex flex-col rounded-2xl border bg-card p-5"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-primary">
              {item.kind === 'guide' ? (
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Map className="h-4 w-4" aria-hidden="true" />
              )}
              {t(item.kind)}
            </span>
            <h3 className="mt-3 text-lg font-bold leading-7">{item.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {item.description || t('resourceFallback')}
            </p>
            {item.authorUsername && (
              <p className="mt-3 text-xs text-muted-foreground">@{item.authorUsername}</p>
            )}
            <Link
              href={item.href}
              prefetch={false}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
            >
              {t(item.kind === 'guide' ? 'readResource' : 'openResource')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t(resources.length ? 'resourcesNoMatch' : 'resourcesEmpty')}
          </p>
          {resources.length > 0 && (
            <button
              type="button"
              className="mt-3 min-h-11 rounded-xl border px-4 text-sm font-semibold"
              onClick={() => {
                setQuery('');
                setType('all');
              }}
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}
      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + 6)}
          className="min-h-11 rounded-xl border px-5 text-sm font-semibold"
        >
          {t('showMore')}
        </button>
      )}
      <div className="flex flex-wrap gap-4 border-t pt-4 text-sm font-semibold text-primary">
        <Link href="/blog" prefetch={false}>
          {t('allBlog')}
        </Link>
        <Link href="/koleksiyonlar" prefetch={false}>
          {t('allCollections')}
        </Link>
      </div>
    </section>
  );
}

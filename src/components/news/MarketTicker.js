import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

function formatPrice(item, locale) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    style: 'currency',
    currency: item.currency || 'USD',
    maximumFractionDigits: item.price < 10 ? 3 : 2,
  }).format(item.price);
}

function TickerItem({ item, locale }) {
  const positive = item.changePercent > 0;
  const negative = item.changePercent < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  return (
    <div className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-xs sm:text-sm">
      <span className="font-bold text-white">{item.label}</span>
      <span className="tabular-nums text-slate-200">{formatPrice(item, locale)}</span>
      <span
        className={`inline-flex items-center tabular-nums ${positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-slate-400'}`}
      >
        <Icon className="mr-0.5 h-3.5 w-3.5" aria-hidden="true" />
        {Math.abs(item.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

export function MarketTicker({ items, locale, label }) {
  if (!items.length) return null;
  return (
    <section
      aria-label={label}
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-white/10 bg-slate-950"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-950 to-transparent" />
      <div className="market-ticker-track flex w-max items-center" aria-live="off">
        {[...items, ...items].map((item, index) => (
          <TickerItem key={`${item.symbol}-${index}`} item={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}

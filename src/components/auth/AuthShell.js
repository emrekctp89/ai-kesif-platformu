import ScrollingQuotes from '@/components/ScrollingQuotes';

/**
 * Auth sayfaları için ortak iki sütunlu kabuk (form + marka paneli).
 */
export function AuthShell({ children }) {
  return (
    <div className="-mx-4 -my-4 min-h-[calc(100vh-8rem)] overflow-hidden rounded-none border-y border-border/50 bg-background md:-mx-6 md:-my-6 md:min-h-[calc(100vh-6rem)] lg:grid lg:grid-cols-2 lg:rounded-3xl lg:border lg:shadow-xl">
      <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-950/[0.03] via-transparent to-purple-800/[0.04]" />
        <div className="relative z-10 w-full">{children}</div>
      </div>
      <ScrollingQuotes />
    </div>
  );
}

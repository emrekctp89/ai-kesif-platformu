import ScrollingQuotes from '@/components/ScrollingQuotes';

/**
 * Auth sayfaları için ortak iki sütunlu kabuk (form + marka paneli).
 */
export function AuthShell({ children }) {
  return (
    <div className="-mx-4 -my-4 min-h-[calc(100vh-8rem)] overflow-hidden rounded-none border-y border-border/50 bg-background md:-mx-6 md:-my-6 md:min-h-[calc(100vh-6rem)] lg:grid lg:grid-cols-2 lg:rounded-3xl lg:border">
      <div className="flex items-center justify-center px-4 py-10 sm:px-8 sm:py-12">{children}</div>
      <ScrollingQuotes />
    </div>
  );
}

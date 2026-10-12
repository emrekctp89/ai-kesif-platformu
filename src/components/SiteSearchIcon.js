import Image from 'next/image';

/** The same planet mark exposed to search engines as the site's favicon. */
export function SiteSearchIcon({ className = 'h-6 w-6' }) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      aria-hidden="true"
    >
      <Image src="/favicon.ico" alt="" fill sizes="32px" className="object-cover" />
    </span>
  );
}

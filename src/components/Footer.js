import Link from 'next/link';

const footerLinks = [
  { href: '/kategori', label: 'Kategoriler' },
  { href: '/kesfet', label: 'Keşfet' },
  { href: '/topluluk', label: 'Topluluk' },
  { href: '/leaderboard', label: 'Liderlik' },
  { href: '/karsilastir', label: 'Karşılaştır' },
  { href: '/tavsiye', label: 'AI Tavsiye' },
  { href: '/blog', label: 'Blog' },
  { href: '/eserler', label: 'Eserler' },
  { href: '/koleksiyonlar', label: 'Koleksiyonlar' },
  { href: '/ogren', label: 'Öğren' },
  { href: '/random-tools', label: 'Rastgele' },
  { href: '/submit', label: 'Araç Öner' },
  { href: '/developer', label: 'Geliştirici' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/gizlilik', label: 'Gizlilik' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <Link href="/" className="mb-2 block text-xl font-bold tracking-tight text-foreground">
              AI Keşif
            </Link>
            <p className="mb-1 text-sm text-muted-foreground">
              © {year} AI Keşif Platformu. Tüm hakları saklıdır.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">by Emre KOCATEPE</p>
          </div>

          <nav
            aria-label="Alt menü"
            className="flex flex-wrap justify-center gap-x-5 gap-y-3 md:justify-end"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

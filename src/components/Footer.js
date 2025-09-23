import Link from 'next/link'
import { Twitter, Github, Linkedin } from 'lucide-react'

// Sosyal Medya İkonları için bir alt bileşen
const SocialLink = ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
        {children}
    </Link>
);

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12">
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                {/* Sol Taraf: Logo ve Copyright */}
                <div className="text-center md:text-left">
                    <Link href="/" className="text-xl font-bold tracking-tight text-foreground mb-2 block">
                        AI Keşif
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} AI Keşif Platformu. Tüm hakları saklıdır.
                    </p>
                </div>

                {/* Orta: Sayfa Linkleri */}
                <div className="flex flex-wrap justify-end gap-x-6 gap-y-2">
                    <Link href="/hakkimizda" className="text-sm font-medium hover:text-primary transition-colors">Hakkımızda</Link>
                    {/* YENİ: İletişim linki eklendi */}
                    <Link href="/iletisim" className="text-sm font-medium hover:text-primary transition-colors">İletişim</Link>
                    <Link href="/gizlilik" className="text-sm font-medium hover:text-primary transition-colors">Gizlilik Politikası</Link>
                    <Link href="/kullanim-kosullari" className="text-sm font-medium hover:text-primary transition-colors">Kullanım Koşulları</Link>
                </div>

                
            </div>
        </div>
    </footer>
  )
}

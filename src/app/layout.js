// src/app/layout.js

import './globals.css';
// Inter fontunu sildik, yerine Onest'i ekledik
import { Onest } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Yeni fontumuzu yapılandırıyoruz
const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'], // İhtiyacımız olan font kalınlıkları
});

export const metadata = {
  title: 'AI Keşif Platformu',
  description: 'Her İhtiyaca Yönelik En İyi Yapay Zeka Araçları Dizini',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      {/* className'e yeni fontumuzu ve mevcut stilimizi ekliyoruz */}
      <body className={`${onest.className} bg-gray-50`}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto p-4 md:p-6">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
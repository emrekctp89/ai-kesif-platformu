'use client';

import { useEffect, useState } from 'react';
import { Bot, Quote } from 'lucide-react';
import { FutureAiGlyph } from '@/components/FutureAiGlyph';

const quotes = [
  {
    quote:
      'Üç günde, fikir aşamasından canlı bir web sitesine... Bu platform, hızın ve modern teknolojinin kanıtı.',
    author: 'Bir Geliştirici',
  },
  {
    quote:
      'Aradığım tüm yapay zeka araçları tek bir yerde. Zaman kazandıran, ilham veren bir merkez.',
    author: 'İçerik Üreticisi',
  },
  {
    quote:
      'Sadece bir araç listesi değil, aynı zamanda yeni teknolojileri keşfetmek için bir başlangıç noktası.',
    author: 'Teknoloji Meraklısı',
  },
  {
    quote:
      'Kullanıcı dostu arayüzü ve akıcı deneyimiyle, bu proje potansiyelin tasarımla buluşmasıdır.',
    author: 'UI/UX Tasarımcısı',
  },
  {
    quote:
      'Hayal gücü bilgiden daha önemlidir. Çünkü bilgi sınırlıdır, ama hayal gücü tüm dünyayı kapsar.',
    author: 'Albert Einstein',
  },
  {
    quote: 'Bir şeyi basitçe açıklayamıyorsan, onu yeterince iyi anlamamışsındır.',
    author: 'Richard Feynman',
  },
  {
    quote: 'Teknoloji iyi ya da kötü değildir; nasıl kullandığınıza bağlıdır.',
    author: 'Gene Spafford',
  },
  {
    quote: 'Gerçekten yeni bir fikri kabul etmek için eski kuşağın ölmesini beklemek gerekebilir.',
    author: 'Max Planck',
  },
  {
    quote: 'Hiçbir şey sorgulanamaz değildir. Bilim, sürekli şüpheyle ilerler.',
    author: 'Carl Sagan',
  },
  {
    quote: 'En derin gerçekler genellikle en basit ifadelerle anlatılabilir.',
    author: 'Stephen Hawking',
  },
];

const highlights = [
  'Binlerce AI aracı tek listede',
  'Kişisel tavsiye ve karşılaştırma',
  'Topluluk eserleri ve akış',
];

export default function ScrollingQuotes() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="brand-gradient-flow relative hidden h-full min-h-[520px] overflow-hidden lg:flex lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-8 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-lg flex-col gap-10 px-10 py-12 text-white">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm">
          <FutureAiGlyph className="h-4 w-4" />
          AI Keşif Platformu
        </div>

        <div className="relative min-h-[220px]">
          <Quote className="mb-4 h-8 w-8 text-white/50" aria-hidden="true" />
          {quotes.map((item, index) => (
            <div
              key={`${item.author}-${index}`}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentIndex
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-3 opacity-0'
              }`}
              aria-hidden={index !== currentIndex}
            >
              <blockquote className="text-2xl font-semibold leading-relaxed tracking-tight xl:text-3xl">
                {item.quote}
              </blockquote>
              <p className="mt-5 text-sm font-medium text-white/80">— {item.author}</p>
            </div>
          ))}
        </div>

        <ul className="space-y-3 border-t border-white/15 pt-6">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-white/90">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="flex gap-1.5" aria-hidden="true">
          {quotes.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/35'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

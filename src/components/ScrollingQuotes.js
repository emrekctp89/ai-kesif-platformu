'use client'

import { useState, useEffect } from 'react'

const quotes = [
  {
    quote: "Üç günde, fikir aşamasından canlı bir web sitesine... Bu platform, hızın ve modern teknolojinin kanıtı.",
    author: "Bir Geliştirici",
  },
  {
    quote: "Aradığım tüm yapay zeka araçları tek bir yerde. Zaman kazandıran, ilham veren bir merkez.",
    author: "İçerik Üreticisi",
  },
  {
    quote: "Sadece bir araç listesi değil, aynı zamanda yeni teknolojileri keşfetmek için bir başlangıç noktası.",
    author: "Teknoloji Meraklısı",
  },
  {
    quote: "Kullanıcı dostu arayüzü ve akıcı deneyimiyle, bu proje potansiyelin tasarımla buluşmasıdır.",
    author: "UI/UX Tasarımcısı",
  },
  {
  quote: "Hayal gücü bilgiden daha önemlidir. Çünkü bilgi sınırlıdır, ama hayal gücü tüm dünyayı kapsar.",
  author: "Albert Einstein",
},
{
  quote: "Bir şeyi basitçe açıklayamıyorsan, onu yeterince iyi anlamamışsındır.",
  author: "Richard Feynman",
},
{
  quote: "Teknoloji iyi ya da kötü değildir; nasıl kullandığınıza bağlıdır.",
  author: "Gene Spafford",
},
{
  quote: "Gerçekten yeni bir fikri kabul etmek için eski kuşağın ölmesini beklemek gerekebilir.",
  author: "Max Planck",
},
{
  quote: "Hiçbir şey sorgulanamaz değildir. Bilim, sürekli şüpheyle ilerler.",
  author: "Carl Sagan",
},
{
  quote: "En derin gerçekler genellikle en basit ifadelerle anlatılabilir.",
  author: "Stephen Hawking",
},
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
    // DEĞİŞİKLİK: 'bg-muted' sınıfını buradan kaldırdık.
    // Artık bu div, sayfanın genel arka plan rengini kullanacak.
    <div className="hidden lg:flex items-center justify-center p-12 text-center h-full relative overflow-hidden">
      <div className="w-full max-w-lg">
        {quotes.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-x-12 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className={index === currentIndex ? "animate-fade-in-scroll-up" : ""}>
              <blockquote className="text-2xl italic font-semibold text-foreground">
                "{item.quote}"
              </blockquote>
              <p className="text-base text-muted-foreground mt-4">- {item.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

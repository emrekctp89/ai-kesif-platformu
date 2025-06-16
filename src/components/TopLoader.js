"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css"; // Kütüphanenin kendi temel CSS'i

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // NProgress'in temel yapılandırması
    NProgress.configure({ showSpinner: false }); // Sağ üstteki dönen ikonu kapatıyoruz

    // Sayfa geçişi başladığında animasyonu başlat
    NProgress.start();

    // Sayfa geçişi tamamlandığında animasyonu bitir
    NProgress.done();
  }, [pathname, searchParams]); // URL her değiştiğinde bu efekti tetikle

  // Bu bileşen ekrana hiçbir şey çizmez, sadece arka planda çalışır.
  return null;
}

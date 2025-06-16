"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";

export function SearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = React.useState(
    searchParams.get("search") || ""
  );
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // DEĞİŞİKLİK: Bu useEffect artık çok daha akıllı.
  // Sadece kullanıcı tarafından yazılan arama metni ile URL'deki metin
  // birbirinden farklı olduğunda çalışır.
  React.useEffect(() => {
    const currentSearchInUrl = searchParams.get("search") || "";

    // Eğer debounced (gecikmeli) arama terimi, URL'deki ile aynı ise, HİÇBİR ŞEY YAPMA.
    if (debouncedSearchTerm === currentSearchInUrl) {
      return;
    }

    // Eğer farklıysa, URL'i güncelle.
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    } else {
      params.delete("search");
    }

    // Yeni bir arama yapıldığında her zaman 1. sayfaya dön
    params.delete("page");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearchTerm, searchParams, router, pathname]);

  return (
    <div className="w-full md:w-auto md:flex-grow max-w-md">
      <Input
        type="text"
        placeholder="Araç adı veya açıklama..."
        className="block w-full px-4 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
}

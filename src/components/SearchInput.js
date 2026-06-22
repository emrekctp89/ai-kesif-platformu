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
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // Gecikmeyi biraz artırabiliriz

  React.useEffect(() => {
    const currentSearchInUrl = searchParams.get("search") || "";
    if (debouncedSearchTerm === currentSearchInUrl) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    } else {
      params.delete("search");
    }

    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearchTerm, searchParams, router, pathname]);

  return (
    <search
      className="w-full max-w-md md:w-auto md:flex-grow"
      aria-label="Araçlarda ara"
    >
      <label htmlFor="tool-search" className="sr-only">
        Yapay zeka aracı ara
      </label>
      <Input
        id="tool-search"
        type="text"
        // DEĞİŞİKLİK: Kullanıcıyı doğal dilde arama yapmaya teşvik ediyoruz
        placeholder="Ne yapmak istiyorsunuz? Örn. video oluşturma"
        className="block w-full px-4 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </search>
  );
}

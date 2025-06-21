"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
// DEĞİŞİKLİK: Erişilebilirlik için DialogTitle ve DialogDescription'ı import ediyoruz
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDebounce } from "use-debounce";
import { runOmniSearch } from "@/app/actions";
import { FileText, Laptop, User, CornerDownLeft } from "lucide-react";

// Sonuçları türlerine göre gruplayan bir yardımcı fonksiyon
const groupResults = (results) => {
  return results.reduce((acc, result) => {
    const type = result.result_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {});
};

const resultIcons = {
  Araç: <Laptop className="mr-2 h-4 w-4" />,
  "Blog Yazısı": <FileText className="mr-2 h-4 w-4" />,
  Kullanıcı: <User className="mr-2 h-4 w-4" />,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (debouncedQuery.length > 1) {
      setIsLoading(true);
      runOmniSearch(debouncedQuery).then((data) => {
        setResults(groupResults(data));
        setIsLoading(false);
      });
    } else {
      setResults(null);
    }
  }, [debouncedQuery]);

  const runCommand = React.useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* DEĞİŞİKLİK: Erişilebilirlik için gizli başlık ve açıklama ekliyoruz */}
        <DialogTitle className="sr-only">Genel Arama</DialogTitle>
        <DialogDescription className="sr-only">
          Sitedeki araçları, blog yazılarını veya kullanıcıları arayın.
        </DialogDescription>

        <CommandInput
          placeholder="Herhangi bir şeyi arayın..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && <CommandEmpty>Aranıyor...</CommandEmpty>}
          {!isLoading && !results && (
            <CommandEmpty>
              Araç, blog yazısı veya kullanıcı arayın.
            </CommandEmpty>
          )}

          {results && Object.keys(results).length === 0 && !isLoading && (
            <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          )}

          {results &&
            Object.entries(results).map(([type, items]) => (
              <CommandGroup key={type} heading={type}>
                {items.map((item) => (
                  <CommandItem
                    key={item.url}
                    value={`${item.title} ${item.description}`}
                    onSelect={() => runCommand(() => router.push(item.url))}
                  >
                    {resultIcons[type]}
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

          <CommandSeparator />
          <CommandGroup heading="Hızlı Eylemler">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/submit"))}
            >
              <CornerDownLeft className="mr-2 h-4 w-4" />
              Yeni Araç Öner
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

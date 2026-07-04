"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Palette, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudioError({ error, reset }) {
  useEffect(() => {
    console.error("[studio-error]", { digest: error?.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 rounded-full bg-destructive/10 p-4 text-destructive">
        <Palette className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">
        Stüdyo yüklenirken sorun oluştu
      </h1>
      <p className="mt-3 text-muted-foreground">
        AI Stüdyo&apos;ya şu anda erişilemiyor. Geçici bir sorun yaşanıyor
        olabilir.
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-muted-foreground">
          Hata kodu: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Yeniden Dene
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Ana Sayfa
          </Link>
        </Button>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sayfa Bulunamadı",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
        Sayfa bulunamadı
      </h1>
      <p className="mt-4 text-muted-foreground">
        Aradığınız içerik kaldırılmış, taşınmış veya adresi yanlış yazılmış
        olabilir.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Ana Sayfa
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tavsiye">
            <Search className="mr-2 h-4 w-4" />
            Araç Bul
          </Link>
        </Button>
      </div>
    </div>
  );
}

// components/BackToHome.js
import Link from "next/link";

export default function BackToHome() {
  return (
    <div className="fixed top-4 left-4 z-50">
      <Link
  href="/"
  className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground ml-4 sm:ml-0 inline-block"
>
  AI Keşif
</Link>

    </div>
  );
}

// components/BackToHome.js
import Link from 'next/link';
import { FutureAiGlyph } from '@/components/FutureAiGlyph';

export default function BackToHome() {
  return (
    <div className="fixed top-4 left-4 z-50">
      <Link
        href="/"
        className="ml-4 inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:ml-0 sm:text-3xl"
      >
        <FutureAiGlyph className="h-7 w-7 sm:h-8 sm:w-8" />
        AI Keşif
      </Link>
    </div>
  );
}

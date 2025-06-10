// src/components/Header.js

import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          AI Keşif
        </Link>
        <nav>
          {/* Butonu Link component'ine çeviriyoruz */}
          <Link href="/submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Araç Öner
          </Link>
        </nav>
      </div>
    </header>
  );
}
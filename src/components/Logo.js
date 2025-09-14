'use client'

import { BrainCircuit } from 'lucide-react'
import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2" aria-label="Ana Sayfa">
      <BrainCircuit className="h-6 w-6 text-primary" />
    </Link>
  )
}

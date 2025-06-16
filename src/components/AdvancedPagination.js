'use client'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useSearchParams } from 'next/navigation'

// Gösterilecek sayfa numaralarını üreten yardımcı fonksiyon
const generatePagination = (currentPage, totalPages) => {
  // Eğer 7 veya daha az sayfa varsa, hepsini göster
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // Mevcut sayfa ilk 3 sayfadan biriyse: 1, 2, 3, ..., son-1, son
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages]
  }

  // Mevcut sayfa son 3 sayfadan biriyse: 1, 2, ..., son-2, son-1, son
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages]
  }

  // Mevcut sayfa ortalardaysa: 1, ..., önceki, mevcut, sonraki, ..., son
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ]
}

export function AdvancedPagination({ currentPage, totalPages }) {
  const searchParams = useSearchParams()
  const paginationRange = generatePagination(currentPage, totalPages)

  // Sayfa linklerini oluştururken mevcut diğer filtreleri (kategori, arama vs.) korur
  const createPageURL = (pageNumber) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `/?${params.toString()}`
  }

  // Eğer sadece 1 sayfa varsa, sayfalama bileşenini hiç gösterme
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Pagination>
      <PaginationContent>
        {/* 'Önceki' butonu */}
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious href={createPageURL(currentPage - 1)} />
          </PaginationItem>
        )}

        {/* Sayfa numaraları ve üç noktalar */}
        {paginationRange.map((page, index) => {
          if (page === '...') {
            return <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem>
          }

          return (
            <PaginationItem key={page}>
              <PaginationLink href={createPageURL(page)} isActive={currentPage === page}>
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        })}

        {/* 'Sonraki' butonu */}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext href={createPageURL(currentPage + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}

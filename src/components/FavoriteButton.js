'use client'

import { useOptimistic } from 'react'
import { toggleFavorite } from '@/app/actions'
import toast from 'react-hot-toast'

// Kalp ikonu için SVG component'i
function HeartIcon({ isFavorited, ...props }) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            // Favori durumuna göre dolguyu ve rengi ayarlar
            className={`cursor-pointer transition-all duration-200 group-hover:scale-110 ${isFavorited ? 'text-red-500' : 'text-gray-400 group-hover:text-red-400'}`}
            fill={isFavorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    )
}

export default function FavoriteButton({ toolId, toolSlug, isInitiallyFavorited }) {
  // useOptimistic, sunucu cevabını beklemeden arayüzü anında günceller.
  const [optimisticFavorited, toggleOptimisticFavorite] = useOptimistic(
    isInitiallyFavorited,
    (state) => !state // Mevcut durumun tersini uygula
  );

  const handleFavoriteClick = async () => {
    // İyimser güncellemeyi başlat
    toggleOptimisticFavorite(!optimisticFavorited);
    
    // Server action'ı çağır
    const result = await toggleFavorite(toolId, toolSlug, optimisticFavorited);

    if (result?.error) {
      toast.error(result.error);
    } else if (result?.success) {
      if (result.success === 'added') {
        toast.success("Favorilere eklendi!");
      } else {
        toast.success("Favorilerden çıkarıldı.");
      }
    }
  };

  return (
    <form action={handleFavoriteClick} className="group">
        <button type="submit" aria-label="Favorilere ekle">
            <HeartIcon isFavorited={optimisticFavorited} />
        </button>
    </form>
  );
}

'use client'

import { useState } from 'react'
import { rateTool } from '@/app/actions'
// react-hot-toast'tan 'toast' fonksiyonunu import ediyoruz
import toast from 'react-hot-toast'

// Yıldız ikonu için bir SVG component'i (Değişiklik yok)
function StarIcon({ isFilled, isHovered, ...props }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={`cursor-pointer transition-colors duration-200 
        ${isFilled ? 'text-yellow-400' : 'text-gray-300'} 
        ${isHovered ? '!text-yellow-400' : ''}`
      }
      fill={isFilled || isHovered ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  )
}

export default function StarRating({ toolId, toolSlug, currentUsersRating = 0 }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(currentUsersRating);

  // Bir yıldıza tıklandığında çalışacak fonksiyonu güncelliyoruz
  const handleRatingSubmit = async (rating) => {
    setCurrentRating(rating);
    
    const formData = new FormData();
    formData.append('toolId', toolId);
    formData.append('toolSlug', toolSlug);
    formData.append('rating', rating);

    // DEĞİŞİKLİK BURADA BAŞLIYOR
    // Server action'dan dönen sonucu yakalıyoruz
    const result = await rateTool(formData);

    // Dönen sonuca göre başarılı veya hatalı bildirim gösteriyoruz
    if (result?.success) {
      toast.success(result.success);
    } else if (result?.error) {
      toast.error(result.error);
    }
    // DEĞİŞİKLİK BİTTİ
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const ratingValue = star;
          return (
            <form action={() => handleRatingSubmit(ratingValue)} key={ratingValue}>
                <button
                    type="submit"
                    onMouseEnter={() => setHoverRating(ratingValue)}
                    onMouseLeave={() => setHoverRating(0)}
                >
                    <StarIcon 
                        isFilled={ratingValue <= currentRating}
                        isHovered={ratingValue <= hoverRating}
                    />
                </button>
            </form>
          );
        })}
      </div>
      <p className="text-muted-foreground text-sm">
        ({currentRating > 0 ? `Oyunuz: ${currentRating}` : "Puan verin"})
      </p>
    </div>
  );
}

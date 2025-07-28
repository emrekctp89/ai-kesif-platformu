'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { upsertRating } from '@/app/actions' // Yeni fonksiyonu import ediyoruz
import toast from 'react-hot-toast'
import { Button } from './ui/button'

export default function StarRating({ toolId, toolSlug, currentUsersRating = 0 }) {
    const [rating, setRating] = React.useState(currentUsersRating);
    const [hover, setHover] = React.useState(0);
    const [isPending, startTransition] = useTransition();

    const handleRating = (newRating) => {
        setRating(newRating);
        
        startTransition(async () => {
            const formData = new FormData();
            formData.append('toolId', toolId);
            formData.append('toolSlug', toolSlug);
            formData.append('rating', newRating);
            
            const result = await upsertRating(formData);
            if (result?.error) {
                toast.error(result.error);
                // Hata durumunda, oylamayı eski haline geri al
                setRating(currentUsersRating);
            } else {
                toast.success(result.success);
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            {[...Array(5)].map((star, index) => {
                const ratingValue = index + 1;
                return (
                    <button
                        type="button"
                        key={ratingValue}
                        className={cn("transition-colors", ratingValue <= (hover || rating) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600")}
                        onClick={() => handleRating(ratingValue)}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
                        disabled={isPending}
                    >
                        <Star className="w-8 h-8 fill-current" />
                    </button>
                );
            })}
        </div>
    );
}

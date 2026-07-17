'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { upsertRating } from '@/app/actions';
import toast from 'react-hot-toast';

export default function StarRating({ toolId, toolSlug, currentUsersRating = 0, size = 'md' }) {
  const [rating, setRating] = React.useState(currentUsersRating);
  const [hover, setHover] = React.useState(0);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setRating(currentUsersRating);
  }, [currentUsersRating]);

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
        setRating(currentUsersRating);
      } else {
        toast.success(result.success);
      }
    });
  };

  const starClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div className="flex items-center gap-1 sm:gap-1.5" role="radiogroup" aria-label="Araç puanı">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        const isActive = ratingValue <= (hover || rating);
        return (
          <button
            type="button"
            key={ratingValue}
            role="radio"
            aria-checked={rating === ratingValue}
            aria-label={`${ratingValue} yıldız`}
            className={cn(
              'rounded-md p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'text-amber-400' : 'text-muted-foreground/40 hover:text-amber-300',
              isPending && 'opacity-70'
            )}
            onClick={() => handleRating(ratingValue)}
            onMouseEnter={() => setHover(ratingValue)}
            onMouseLeave={() => setHover(0)}
            disabled={isPending}
          >
            <Star className={cn(starClass, 'fill-current')} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

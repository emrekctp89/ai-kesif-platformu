'use client'

import { useTransition } from 'react'
import { Switch } from "@/components/ui/switch"
import { toggleFeatured } from "@/app/actions"
import toast from 'react-hot-toast'

export function FeaturedToggle({ toolId, isFeatured }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('toolId', toolId);
      formData.append('isFeatured', checked);

      const result = await toggleFeatured(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`featured-switch-${toolId}`}
        checked={isFeatured}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label="Öne çıkan yap"
      />
      <label htmlFor={`featured-switch-${toolId}`} className="text-sm font-medium text-muted-foreground">
        Öne Çıkan
      </label>
    </div>
  )
}

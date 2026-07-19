import logger from '@/utils/logger';
('use client');

import { useEffect, useState } from 'react';
import FavoriteButton from '@/components/FavoriteButton';
import StarRating from '@/components/StarRating';
import { createClient } from '@/utils/supabase/client';
import { useTranslations } from 'next-intl';
import { LoaderCircle } from 'lucide-react';

/**
 * Interactive rating + favorite controls for the tool detail page.
 * Parent stays cacheable; user state is hydrated on the client.
 */
export function ToolDetailActions({ toolId, toolSlug }) {
  const t = useTranslations('ToolDetail');
  const [ready, setReady] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function hydrateUserState() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setIsLoggedIn(false);
          setReady(true);
          return;
        }

        setIsLoggedIn(true);

        const [favoriteResult, ratingResult] = await Promise.all([
          supabase
            .from('favorites')
            .select('tool_id')
            .eq('user_id', user.id)
            .eq('tool_id', toolId)
            .maybeSingle(),
          supabase
            .from('ratings')
            .select('rating')
            .eq('user_id', user.id)
            .eq('tool_id', toolId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        setIsFavorited(Boolean(favoriteResult.data?.tool_id));
        setUserRating(Number(ratingResult.data?.rating) || 0);
      } catch (error) {
        logger.error('Araç detay kullanıcı durumu yüklenemedi:', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    hydrateUserState();
    return () => {
      cancelled = true;
    };
  }, [toolId]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('rateTool')}
        </p>
        {!ready ? (
          <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">{t('loadingUserState')}</span>
          </div>
        ) : (
          <StarRating
            key={`rating-${toolId}-${userRating}-${isLoggedIn}`}
            toolId={toolId}
            toolSlug={toolSlug}
            currentUsersRating={userRating}
          />
        )}
        {ready && !isLoggedIn ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{t('loginToRate')}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 self-start rounded-xl border border-border/60 bg-background/70 px-3 py-2 sm:self-auto">
        {!ready ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <FavoriteButton
            key={`fav-${toolId}-${isFavorited}`}
            toolId={toolId}
            toolSlug={toolSlug}
            isInitiallyFavorited={isFavorited}
          />
        )}
        <span className="text-sm font-medium text-muted-foreground">{t('favorite')}</span>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Compass,
  Flame,
  Heart,
  MessageSquare,
  Star,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { questActionDeepLink } from '@/lib/contentCreatorRules';

const questIcons = {
  rating: <Star className="h-5 w-5 text-yellow-500" aria-hidden="true" />,
  comment: <MessageSquare className="h-5 w-5 text-blue-500" aria-hidden="true" />,
  favorite: <Heart className="h-5 w-5 text-red-500" aria-hidden="true" />,
  follow_user: <UserPlus className="h-5 w-5 text-green-500" aria-hidden="true" />,
  visit_tool: <Compass className="h-5 w-5 text-purple-500" aria-hidden="true" />,
};

const CTA_KEYS = {
  questCtaRate: 'questCtaRate',
  questCtaComment: 'questCtaComment',
  questCtaFavorite: 'questCtaFavorite',
  questCtaVisit: 'questCtaVisit',
  questCtaFollow: 'questCtaFollow',
  questCtaDefault: 'questCtaDefault',
};

/**
 * @param {{
 *   quests: Array,
 *   streak?: number,
 *   questLinkOpts?: { featuredToolSlug?: string|null, popularToolSlug?: string|null, sampleUsername?: string|null },
 * }} props
 */
export function DailyQuests({ quests, streak = 0, questLinkOpts = {} }) {
  const t = useTranslations('ProfileComponents');
  const tc = useTranslations('ContentStudio');

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('questsTitle')}</span>
          {streak > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 font-bold text-orange-500">
                    <Flame className="h-5 w-5" aria-hidden="true" />
                    <span>{t('streakDays', { count: streak })}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('streakTip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </CardTitle>
        <CardDescription>{t('questsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {quests && quests.length > 0 ? (
          quests.map((quest) => {
            const target = quest.quests?.target_count || 1;
            const progress = (quest.current_progress / target) * 100;
            const actionType = quest.quests?.action_type || '';
            const deep = questActionDeepLink(actionType, questLinkOpts);
            const ctaLabel = tc(CTA_KEYS[deep.ctaKey] || 'questCtaDefault');

            return (
              <div
                key={quest.quest_id}
                className="space-y-2 rounded-xl border border-border/40 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2 font-medium">
                    {quest.is_completed ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                    ) : (
                      questIcons[actionType] || null
                    )}
                    <span className="truncate">{quest.quests?.description}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-primary">
                    {t('questPoints', { count: quest.quests?.reputation_reward || 0 })}
                  </span>
                </div>
                {!quest.is_completed ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="w-full" />
                      <span className="text-xs text-muted-foreground">
                        {quest.current_progress}/{target}
                      </span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                      <Link href={deep.href} prefetch={false}>
                        {ctaLabel}
                        <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('questsEmpty')}</p>
        )}
      </CardContent>
    </Card>
  );
}

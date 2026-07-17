'use client';

import { Flame, Star, MessageSquare, Heart, UserPlus, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const questIcons = {
  rating: <Star className="h-5 w-5 text-yellow-500" aria-hidden="true" />,
  comment: <MessageSquare className="h-5 w-5 text-blue-500" aria-hidden="true" />,
  favorite: <Heart className="h-5 w-5 text-red-500" aria-hidden="true" />,
  follow_user: <UserPlus className="h-5 w-5 text-green-500" aria-hidden="true" />,
};

export function DailyQuests({ quests, streak }) {
  const t = useTranslations('ProfileComponents');

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
            return (
              <div key={quest.quest_id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2 font-medium">
                    {quest.is_completed ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                    ) : (
                      questIcons[quest.quests?.action_type] || null
                    )}
                    <span className="truncate">{quest.quests?.description}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-primary">
                    {t('questPoints', { count: quest.quests?.reputation_reward || 0 })}
                  </span>
                </div>
                {!quest.is_completed ? (
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="w-full" />
                    <span className="text-xs text-muted-foreground">
                      {quest.current_progress}/{target}
                    </span>
                  </div>
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

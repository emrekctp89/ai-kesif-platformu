'use client';

import { Trophy, Star, MessageSquare, Plus, Heart, Award, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EVENT_KEYS = {
  yeni_prompt_gonderdi: 'eventPromptShare',
  prompt_oyu_aldi: 'eventPromptVote',
  prompt_oyu_iptal_edildi: 'eventPromptUnvote',
  araca_puan_verdi: 'eventRatedTool',
  yeni_yorum_yapti: 'eventComment',
  arac_onerisi_onaylandi: 'eventToolApproved',
  eserin_onaylandi: 'eventShowcaseApproved',
  eser_oyu_aldi: 'eventShowcaseVote',
  eser_yorumu_aldi: 'eventShowcaseComment',
};

const eventIcons = {
  yeni_prompt_gonderdi: <Plus className="h-4 w-4 text-green-500" aria-hidden="true" />,
  prompt_oyu_aldi: <Star className="h-4 w-4 text-yellow-500" aria-hidden="true" />,
  prompt_oyu_iptal_edildi: <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  araca_puan_verdi: <Heart className="h-4 w-4 text-red-500" aria-hidden="true" />,
  yeni_yorum_yapti: <MessageSquare className="h-4 w-4 text-blue-500" aria-hidden="true" />,
  arac_onerisi_onaylandi: <Trophy className="h-4 w-4 text-orange-500" aria-hidden="true" />,
  eserin_onaylandi: <ImageIcon className="h-4 w-4 text-green-500" aria-hidden="true" />,
  eser_oyu_aldi: <Heart className="h-4 w-4 text-pink-500" aria-hidden="true" />,
  eser_yorumu_aldi: <MessageSquare className="h-4 w-4 text-purple-500" aria-hidden="true" />,
};

export function ReputationInfo({ reputationPoints, events }) {
  const t = useTranslations('ProfileComponents');

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" aria-hidden="true" />
          {t('reputationTitle')}
        </CardTitle>
        <CardDescription>{t('reputationDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl bg-muted/50 p-6 text-center">
          <p className="text-5xl font-bold">{reputationPoints}</p>
          <p className="text-sm text-muted-foreground">{t('totalPoints')}</p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">{t('recentActivity')}</h4>
          <div className="space-y-4">
            {events && events.length > 0 ? (
              events.map((event) => {
                const labelKey = EVENT_KEYS[event.event_type];
                return (
                  <div key={event.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {eventIcons[event.event_type] || (
                        <Award className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span className="truncate text-sm">
                        {labelKey ? t(labelKey) : event.event_type}
                      </span>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-bold ${
                        event.points_awarded > 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {event.points_awarded > 0 ? `+${event.points_awarded}` : event.points_awarded}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('noReputationEvents')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

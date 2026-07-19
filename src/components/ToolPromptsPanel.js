'use client';

import logger from '@/utils/logger';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { AddPromptDialog } from '@/components/AddPromptDialog';
import { PromptList } from '@/components/PromptList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Community prompts for a tool — client-side so tool detail ISR stays intact.
 */
export function ToolPromptsPanel({ toolId, toolSlug }) {
  const t = useTranslations('ToolDetail');
  const [prompts, setPrompts] = useState([]);
  const [user, setUser] = useState(null);
  const [userVotes, setUserVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser || null);

      const [promptsResult, votesResult] = await Promise.all([
        supabase
          .from('prompts')
          .select('*, profiles ( username, email, avatar_url )')
          .eq('tool_id', toolId)
          .order('vote_count', { ascending: false }),
        authUser
          ? supabase.from('prompt_votes').select('prompt_id').eq('user_id', authUser.id)
          : Promise.resolve({ data: [] }),
      ]);

      setPrompts(promptsResult.data || []);
      setUserVotes(votesResult.data || []);
    } catch (error) {
      logger.error('Prompt paneli yüklenemedi:', error);
      setPrompts([]);
      setUserVotes([]);
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <Card
      id="tool-prompts"
      className="glass-panel scroll-mt-36 border-border/50 shadow-sm sm:scroll-mt-40"
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle
            id="tool-prompts-heading"
            className="flex items-center gap-2 text-xl sm:text-2xl"
          >
            <Sparkles className="h-5 w-5 text-primary sm:h-6 sm:w-6" aria-hidden="true" />
            {t('promptsHeading')}
          </CardTitle>
          <CardDescription>{t('promptsSubheading')}</CardDescription>
        </div>
        {user ? (
          <AddPromptDialog
            toolId={toolId}
            toolSlug={toolSlug}
            onSuccess={loadData}
            triggerLabel={t('promptShare')}
          />
        ) : (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/login">{t('loginToPrompt')}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t('promptsLoading')}
          </div>
        ) : (
          <PromptList
            prompts={prompts}
            user={user}
            userVotes={userVotes}
            toolSlug={toolSlug}
            emptyLabel={t('promptsEmpty')}
          />
        )}
      </CardContent>
    </Card>
  );
}

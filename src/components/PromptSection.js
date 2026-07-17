import { getTranslations } from 'next-intl/server';

import { createClient } from '@/utils/supabase/server';
import { PromptList } from './PromptList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddPromptDialog } from './AddPromptDialog';

export default async function PromptSection({ toolId, toolSlug }) {
  const t = await getTranslations('ToolDetail');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: userVotes } = user
    ? await supabase.from('prompt_votes').select('prompt_id').eq('user_id', user.id)
    : { data: [] };

  const { data: prompts } = await supabase
    .from('prompts')
    .select(`*, profiles ( username, email, avatar_url )`)
    .eq('tool_id', toolId)
    .order('vote_count', { ascending: false });

  return (
    <Card className="rounded-xl shadow-xl glass-panel border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t('promptsHeading')}</CardTitle>
          <CardDescription>{t('promptsSubheading')}</CardDescription>
        </div>
        {user ? <AddPromptDialog toolId={toolId} toolSlug={toolSlug} /> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <PromptList
          prompts={prompts || []}
          user={user}
          userVotes={userVotes || []}
          toolSlug={toolSlug}
          emptyLabel={t('promptsEmpty')}
        />
      </CardContent>
    </Card>
  );
}

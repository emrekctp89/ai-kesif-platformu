import { createClient } from "@/utils/supabase/server";
import { PromptList } from "./PromptList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AddPromptDialog } from "./AddPromptDialog";

export default async function PromptSection({ toolId, toolSlug }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: userVotes } = user
    ? await supabase
        .from("prompt_votes")
        .select("prompt_id")
        .eq("user_id", user.id)
    : { data: [] };

  // DEĞİŞİKLİK: 'profiles' tablosundan 'username'i de çekiyoruz.
  const { data: prompts } = await supabase
    .from("prompts")
    .select(`*, profiles ( username, email, avatar_url )`)
    .eq("tool_id", toolId)
    .order("vote_count", { ascending: false });

  return (
    <Card className="rounded-xl shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Topluluk Prompt'ları</CardTitle>
          <CardDescription>
            Paylaşılan en iyi prompt'ları keşfedin ve oylayın.
          </CardDescription>
        </div>
        {user && <AddPromptDialog toolId={toolId} toolSlug={toolSlug} />}
      </CardHeader>
      <CardContent className="pt-0">
        <PromptList
          prompts={prompts || []}
          user={user}
          userVotes={userVotes || []}
          toolSlug={toolSlug}
        />
      </CardContent>
    </Card>
  );
}

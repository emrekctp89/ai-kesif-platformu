import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Briefcase } from 'lucide-react';

import { ProjectEditor } from '@/components/ProjectEditor';

async function getProjectDetails(id, userId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(`*, project_items (item_id, item_type)`)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    notFound();
  }
  return data;
}

async function getAllTools() {
  const supabase = await createClient();
  const { data } = await supabase.from('tools').select('id, name').eq('is_approved', true);
  return data || [];
}

async function getAllShowcaseItems(userId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('showcase_items')
    .select('id, title')
    .eq('user_id', userId)
    .eq('is_approved', true);
  return data || [];
}

async function getAllPrompts(userId) {
  const supabase = await createClient();
  const { data } = await supabase.from('prompts').select('id, title').eq('user_id', userId);
  return data || [];
}

export default async function EditProjectPage(props) {
  const params = await props.params;
  const t = await getTranslations('ProfileComponents');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [project, allTools, allShowcaseItems, allPrompts] = await Promise.all([
    getProjectDetails(params.id, user.id),
    getAllTools(),
    getAllShowcaseItems(user.id),
    getAllPrompts(user.id),
  ]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8 pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            {project.title}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('manageProjectTitle', { title: project.title })}
          </h1>
        </div>
      </section>

      <ProjectEditor
        project={project}
        allTools={allTools}
        allShowcaseItems={allShowcaseItems}
        allPrompts={allPrompts}
      />
    </div>
  );
}

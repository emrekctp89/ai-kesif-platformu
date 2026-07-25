-- Job completion funnel for Kâşif interactions.
-- stages: job_stated → tool_recommended → tool_selected → setup_started
--         → setup_completed → first_result → job_done

alter table public.kasif_interactions
  add column if not exists funnel jsonb not null default '{}'::jsonb;

comment on column public.kasif_interactions.funnel is
  'Job completion funnel: { stages: {stage: iso}, selected_tool, minutes_to_first_result, events[] }';

create index if not exists kasif_interactions_funnel_gin_idx
  on public.kasif_interactions using gin (funnel);

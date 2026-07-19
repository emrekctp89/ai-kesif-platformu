-- Repoint community-dependent daily quests to active product surfaces.
-- Soft-landed: /eserler, /topluluk — keep reputation loop on tools + profiles.

update public.quests
set
  name = 'comment_on_tool',
  description = 'Bir Araç Sayfasına Yorum Yaz',
  action_type = 'comment',
  is_active = true
where id = 2
   or name = 'comment_on_showcase';

update public.quests
set
  description = 'Bir Kullanıcıyı Takip Et',
  is_active = true
where id = 3
   or name = 'follow_a_user';

-- Ensure core catalog quests stay active on main product paths.
update public.quests
set is_active = true
where name in (
  'rate_3_tools',
  'favorite_a_tool',
  'visit_5_tools',
  'favorite_featured_tool',
  'comment_on_tool',
  'follow_a_user'
);

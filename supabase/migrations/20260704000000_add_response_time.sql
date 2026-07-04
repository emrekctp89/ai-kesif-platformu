-- tools tablosuna yanıt süresi (milisaniye cinsinden) eklenmesi
alter table public.tools
  add column if not exists link_response_time_ms integer;

-- Run this file AFTER backend/supabase.sql.
-- It enables RLS and auth-sync behavior for FaceTag.

alter table public.users enable row level security;
alter table public.social_links enable row level security;
alter table public.face_embeddings enable row level security;
alter table public.scan_events enable row level security;

-- USERS
create policy "users_public_select"
on public.users for select
using (is_public = true);

create policy "users_owner_select"
on public.users for select
to authenticated
using (auth.uid() = id);

create policy "users_owner_insert"
on public.users for insert
to authenticated
with check (auth.uid() = id);

create policy "users_owner_update"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users_owner_delete"
on public.users for delete
to authenticated
using (auth.uid() = id);

-- SOCIAL LINKS
create policy "social_links_select_public_or_owner"
on public.social_links for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.users u
    where u.id = social_links.user_id
      and u.is_public = true
  )
);

create policy "social_links_owner_insert"
on public.social_links for insert
to authenticated
with check (auth.uid() = user_id);

create policy "social_links_owner_update"
on public.social_links for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "social_links_owner_delete"
on public.social_links for delete
to authenticated
using (auth.uid() = user_id);

-- FACE EMBEDDINGS
-- Direct client SELECT is intentionally blocked. Backend uses service role key, which bypasses RLS.
create policy "face_embeddings_owner_insert"
on public.face_embeddings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "face_embeddings_owner_delete"
on public.face_embeddings for delete
to authenticated
using (auth.uid() = user_id);

-- SCAN EVENTS
create policy "scan_events_owner_select"
on public.scan_events for select
to authenticated
using (scanner_user_id = auth.uid());

create policy "scan_events_insert_authenticated_scanner"
on public.scan_events for insert
to authenticated
with check (scanner_user_id = auth.uid());

-- AUTH SYNC TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, full_name, is_public, created_at)
  values (
    new.id,
    new.email,
    lower(split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    false,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- STORAGE RLS (bucket: avatars)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_owner_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Face photos are never stored in Supabase Storage.
-- They are processed in-memory on the backend and discarded after embeddings are computed.

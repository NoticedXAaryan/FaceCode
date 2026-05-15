create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique,
  full_name text,
  bio text,
  avatar_url text,
  is_public boolean default false,
  primary_link_platform text,
  created_at timestamptz default now()
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  platform text not null check (platform in ('instagram','linkedin','whatsapp','twitter','website')),
  url text not null,
  display_order int default 0
);

create table if not exists public.face_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  embedding double precision[] not null,
  created_at timestamptz default now(),
  constraint embedding_dims check (array_length(embedding, 1) = 128)
);

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  scanner_user_id uuid references public.users(id) on delete set null,
  scanned_user_id uuid references public.users(id) on delete set null,
  timestamp timestamptz default now(),
  matched boolean default false
);

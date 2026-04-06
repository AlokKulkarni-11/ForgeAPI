create extension if not exists pgcrypto;

-- Users / profile table linked to Supabase Auth.
-- Authentication lives in auth.users; this table stores ForgeAPI profile + provider settings.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role text not null default 'user',
  gemini_api_key text,
  ollama_base_url text,
  ollama_api_key text,
  github_token text,
  default_framework text not null default 'nodejs',
  default_db text not null default 'postgresql',
  default_test_mode text not null default 'functional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generated APIs table
create table if not exists public.apis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  status text default 'pending',
  framework text not null,
  database_type text not null,
  owasp_score integer,
  sandbox_port integer,
  sandbox_pid integer,
  sandbox_started_at timestamptz,
  iteration_count integer default 0,
  max_iterations integer default 3,
  github_repo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- API files (generated code files)
create table if not exists public.api_files (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  filename text not null,
  filepath text not null,
  content text not null,
  created_at timestamptz default now()
);

-- API endpoints
create table if not exists public.api_endpoints (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  method text not null,
  path text not null,
  description text,
  request_body jsonb,
  response_example jsonb,
  created_at timestamptz default now()
);

-- Requirements (structured input from user)
create table if not exists public.api_requirements (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  entities jsonb not null,
  endpoints jsonb not null,
  auth_type text default 'none',
  validation_rules jsonb,
  test_mode text default 'functional',
  raw_prompt text,
  created_at timestamptz default now()
);

-- Pipeline logs
create table if not exists public.pipeline_logs (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  agent text not null,
  level text not null,
  message text not null,
  metadata jsonb,
  iteration integer default 0,
  created_at timestamptz default now()
);

-- Security reports (OWASP)
create table if not exists public.security_reports (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  score integer not null,
  iteration integer not null,
  vulnerabilities jsonb,
  passed boolean default false,
  created_at timestamptz default now()
);

-- Test reports
create table if not exists public.test_reports (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  iteration integer not null,
  test_mode text not null,
  total_tests integer,
  passed_tests integer,
  failed_tests integer,
  test_cases jsonb,
  created_at timestamptz default now()
);

-- RLS for user profile access from the client.
alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

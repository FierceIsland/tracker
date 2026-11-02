-- Fierce Island Ops: schema for Supabase (Postgres)
-- Run this once in the Supabase SQL editor.
-- Every table is private to the signed-in user via row-level security.

create extension if not exists "pgcrypto";

-- Time buckets (same ones used in the pricing model) ----------------------
create table if not exists buckets (
  key text primary key,
  label text not null,
  billable boolean not null default true,
  sort int not null default 0
);

insert into buckets (key, label, billable, sort) values
  ('site_build',      'Site build',                    true,  1),
  ('seo',             'SEO',                           true,  2),
  ('aeo_geo',         'AEO / GEO',                     true,  3),
  ('gbp',             'Google Business Profile',       true,  4),
  ('reviews',         'Reviews / reputation',          true,  5),
  ('ads',             'Ads',                           true,  6),
  ('drone',           'Drone',                         true,  7),
  ('package_covered', 'Package-covered work',          false, 8),
  ('sales',           'Sales and marketing',           false, 9),
  ('calls',           'Client calls / account mgmt',   false, 10),
  ('admin',           'Admin (billing, accounting)',   false, 11),
  ('building',        'Building the business',         false, 12),
  ('buffer',          'Buffer / learning / tool issues', false, 13)
on conflict (key) do nothing;

alter table buckets enable row level security;
drop policy if exists "buckets readable" on buckets;
create policy "buckets readable" on buckets for select to authenticated using (true);

-- Clients ------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  trade text,
  status text not null default 'active' check (status in ('prospect','active','paused','churned')),
  package text,                       -- e.g. Foundation, Growth, Full Stack, SEO only
  monthly_price numeric(10,2) default 0,
  hosting_price numeric(10,2) default 0,
  started_on date,
  notes text,
  created_at timestamptz not null default now()
);

-- Projects (one-time builds, retainers, drone jobs, internal work) ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  kind text not null default 'website' check (kind in ('website','retainer','drone','internal')),
  price numeric(10,2) default 0,
  budget_hours numeric(6,2),
  status text not null default 'active' check (status in ('planned','active','done','cancelled')),
  started_on date,
  due_on date,
  created_at timestamptz not null default now()
);

-- Time entries -------------------------------------------------------------
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  bucket_key text not null references buckets(key),
  entry_date date not null default current_date,
  hours numeric(5,2) not null check (hours > 0 and hours <= 24),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists time_entries_date_idx on time_entries (user_id, entry_date desc);
create index if not exists time_entries_project_idx on time_entries (project_id);

-- Invoices (money in) --------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  number text,
  description text,
  amount numeric(10,2) not null,
  issued_on date not null default current_date,
  due_on date,
  paid_on date,
  created_at timestamptz not null default now()
);

-- Expenses (money out, one-off) ----------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  vendor text not null,
  category text not null default 'other'
    check (category in ('contractor','software','compute','advertising','office','insurance','accounting','tax','equipment','other')),
  kind text not null default 'direct' check (kind in ('direct','fixed')),
  amount numeric(10,2) not null,
  incurred_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Recurring costs (software, office, insurance, etc.) -------------------------
create table if not exists recurring_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  vendor text,
  amount numeric(10,2) not null,
  cadence text not null default 'monthly' check (cadence in ('monthly','annual')),
  allocation text not null default 'fixed' check (allocation in ('fixed','per_site','per_client')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pricing model settings (planned hours, targets) -----------------------------
create table if not exists model_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: each person sees only their own rows --------------------
do $$
declare t text;
begin
  foreach t in array array['clients','projects','time_entries','invoices','expenses','recurring_costs','model_settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner all" on %I', t);
    execute format(
      'create policy "owner all" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Subscription history: first and last month each recurring cost was charged
alter table recurring_costs add column if not exists started_on date;
alter table recurring_costs add column if not exists ended_on date;

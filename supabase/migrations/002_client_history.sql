-- Run once in the Supabase SQL editor (safe to run again).
-- Keeps a dated history of each client's package, retainer, and hosting price,
-- so changing a plan never rewrites past months.

create table if not exists client_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  effective_from date not null,
  package text,
  monthly_price numeric(10,2) not null default 0,
  hosting_price numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists client_terms_client_idx on client_terms (client_id, effective_from);

alter table client_terms enable row level security;
drop policy if exists "owner all" on client_terms;
create policy "owner all" on client_terms for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Last month a paused or churned client was billed
alter table clients add column if not exists ended_on date;
update clients set ended_on = current_date where status in ('paused','churned') and ended_on is null;

-- Give every existing client a starting row from their current terms
insert into client_terms (user_id, client_id, effective_from, package, monthly_price, hosting_price, note)
select c.user_id, c.id, coalesce(c.started_on, c.created_at::date), c.package,
       coalesce(c.monthly_price, 0), coalesce(c.hosting_price, 0), 'Starting terms'
from clients c
where not exists (select 1 from client_terms t where t.client_id = c.id);

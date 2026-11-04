-- One retainer project per client, so the app can create them automatically without duplicates.
create unique index if not exists projects_one_retainer_per_client on projects (client_id) where kind = 'retainer';

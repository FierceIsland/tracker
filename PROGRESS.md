# Fierce Island Ops: build progress

Last updated: Sun Nov 1, 2026, 3:36 PM Boise time

## Done
- Next.js 16 app scaffolded in /home/claude/fi-ops (App Router, TypeScript, Tailwind, Supabase packages)
- Database schema written: supabase/schema.sql (clients, projects, time entries, invoices, expenses, recurring costs, model settings, row-level security)
- Pages written: login, dashboard, time, clients, projects, money, settings
- Sign-in and data actions in app/actions.ts; proxy.ts redirects signed-out visitors to /login

## Checked
- Production build passes (needed to turn off Cache Components in next.config.ts)
- Waiting on the user for the sign-ins below

## Still to do (needs the user)
1. Supabase: sign in, create project, run supabase/schema.sql in the SQL editor, create the user login, turn off public signups
2. GitHub: create repo and push
3. Netlify: connect repo and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Firebase is not needed for this build (Supabase covers the database and login)

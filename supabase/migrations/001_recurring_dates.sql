-- Run once in the Supabase SQL editor (safe to run again).
-- Gives each recurring cost a start and end month so canceled subscriptions
-- still count in the months they were charged.

alter table recurring_costs add column if not exists started_on date;
alter table recurring_costs add column if not exists ended_on date;

update recurring_costs set started_on = created_at::date where started_on is null;
update recurring_costs set ended_on = current_date where active = false and ended_on is null;

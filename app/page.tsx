import { supabaseServer } from "@/lib/supabase/server";
import { getSettings, RETAINER_BUCKETS } from "@/lib/settings";
import { daysAgo, hrs, monthStart, monthlyEquivalent, usd } from "@/lib/format";
import { card, td, th } from "@/lib/ui";
import type { Bucket, Client, Expense, Invoice, Project, RecurringCost, TimeEntry } from "@/lib/types";

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

export default async function Dashboard() {
  const sb = await supabaseServer();
  const start = monthStart();
  const since90 = daysAgo(90);

  const [settings, b, tm, t90, tSite, pr, cl, inv, ex, rc] = await Promise.all([
    getSettings(sb),
    sb.from("buckets").select("*").order("sort"),
    sb.from("time_entries").select("*").gte("entry_date", start),
    sb.from("time_entries").select("*").gte("entry_date", since90),
    sb.from("time_entries").select("*").eq("bucket_key", "site_build"),
    sb.from("projects").select("*"),
    sb.from("clients").select("*"),
    sb.from("invoices").select("*"),
    sb.from("expenses").select("*").gte("incurred_on", start),
    sb.from("recurring_costs").select("*").eq("active", true),
  ]);

  const buckets = (b.data ?? []) as Bucket[];
  const monthEntries = (tm.data ?? []) as TimeEntry[];
  const entries90 = (t90.data ?? []) as TimeEntry[];
  const siteEntries = (tSite.data ?? []) as TimeEntry[];
  const projects = (pr.data ?? []) as Project[];
  const clients = (cl.data ?? []) as Client[];
  const invoices = (inv.data ?? []) as Invoice[];
  const expenses = (ex.data ?? []) as Expense[];
  const recurring = (rc.data ?? []) as RecurringCost[];

  // Hours this month, by bucket, against the plan.
  const byBucket = new Map<string, number>();
  for (const e of monthEntries) byBucket.set(e.bucket_key, (byBucket.get(e.bucket_key) ?? 0) + Number(e.hours));
  const totalHours = [...byBucket.values()].reduce((s, v) => s + v, 0);
  const billableKeys = new Set(buckets.filter((x) => x.billable).map((x) => x.key));
  const billableHours = [...byBucket.entries()].filter(([k]) => billableKeys.has(k)).reduce((s, [, v]) => s + v, 0);
  const plannedTotal = Object.values(settings.planned).reduce((s, v) => s + v, 0);

  // Average hours per finished website build.
  const doneSites = projects.filter((x) => x.kind === "website" && x.status === "done");
  const siteHours = new Map<string, number>();
  for (const e of siteEntries) if (e.project_id) siteHours.set(e.project_id, (siteHours.get(e.project_id) ?? 0) + Number(e.hours));
  const doneSiteHours = doneSites.map((x) => siteHours.get(x.id) ?? 0).filter((h) => h > 0);
  const avgSite = doneSiteHours.length ? doneSiteHours.reduce((s, v) => s + v, 0) / doneSiteHours.length : 0;

  // Average retainer hours per active retainer client per month (last 90 days).
  const retainerClients = clients.filter((x) => x.status === "active" && Number(x.monthly_price ?? 0) > 0);
  const retainerHours90 = entries90
    .filter((e) => RETAINER_BUCKETS.includes(e.bucket_key) && e.client_id)
    .reduce((s, e) => s + Number(e.hours), 0);
  const perClient = retainerClients.length ? retainerHours90 / retainerClients.length / 3 : 0;

  // Money this month.
  const invoicedMonth = invoices.filter((x) => x.issued_on >= start).reduce((s, x) => s + Number(x.amount), 0);
  const collectedMonth = invoices.filter((x) => x.paid_on && x.paid_on >= start).reduce((s, x) => s + Number(x.amount), 0);
  const outstanding = invoices.filter((x) => !x.paid_on).reduce((s, x) => s + Number(x.amount), 0);
  const oneOff = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const recurringMonthly = recurring.reduce((s, x) => s + monthlyEquivalent(Number(x.amount), x.cadence), 0);
  const costsMonth = oneOff + recurringMonthly;
  const mrr = clients
    .filter((x) => x.status === "active")
    .reduce((s, x) => s + Number(x.monthly_price ?? 0) + Number(x.hosting_price ?? 0), 0);

  const flag = (actual: number, target: number) => (actual > 0 && actual > target ? "text-red-700 font-semibold" : "");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat title="Hours this month" value={hrs(totalHours)} sub={"plan " + hrs(plannedTotal) + " · billable " + hrs(billableHours)} />
        <Stat title="Monthly recurring" value={usd(mrr)} sub={clients.filter((x) => x.status === "active").length + " active clients"} />
        <Stat title="Collected this month" value={usd(collectedMonth)} sub={"invoiced " + usd(invoicedMonth)} />
        <Stat title="Outstanding" value={usd(outstanding)} sub="unpaid invoices" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          title="Avg hours per website"
          value={avgSite ? hrs(avgSite) : "No data"}
          sub={"target " + hrs(settings.target_site_hours) + " · " + doneSiteHours.length + " finished builds"}
        />
        <Stat
          title="Avg hours per retainer client / mo"
          value={perClient ? hrs(perClient) : "No data"}
          sub={"target " + hrs(settings.target_retainer_hours) + " · last 90 days"}
        />
        <Stat
          title="Costs this month"
          value={usd(costsMonth)}
          sub={"recurring " + usd(recurringMonthly) + " · one-off " + usd(oneOff)}
        />
      </div>

      <div className={card + " overflow-x-auto p-0"}>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className={th}>Bucket</th>
              <th className={th}>This month</th>
              <th className={th}>Plan</th>
              <th className={th}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((x) => {
              const actual = byBucket.get(x.key) ?? 0;
              const plan = settings.planned[x.key] ?? 0;
              const diff = actual - plan;
              return (
                <tr key={x.key} className="border-b border-stone-100 last:border-0">
                  <td className={td}>
                    {x.label}
                    {!x.billable && <span className="ml-2 text-xs text-stone-400">non-billable</span>}
                  </td>
                  <td className={td + " " + flag(actual, plan)}>{hrs(actual)}</td>
                  <td className={td}>{hrs(plan)}</td>
                  <td className={td + " text-stone-500"}>{diff > 0 ? "+" + hrs(diff) : hrs(diff)}</td>
                </tr>
              );
            })}
            <tr className="bg-stone-50 font-semibold">
              <td className={td}>Total</td>
              <td className={td}>{hrs(totalHours)}</td>
              <td className={td}>{hrs(plannedTotal)}</td>
              <td className={td + " text-stone-500"}>{hrs(totalHours - plannedTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">
        Red means you are over the plan for that bucket. Change the plan numbers on the Settings page.
      </p>
    </div>
  );
}

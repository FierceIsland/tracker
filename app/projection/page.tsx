import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { buildPeriods, project, type Projection } from "@/lib/projection";
import { monthlyEquivalent, todayBoise, usd } from "@/lib/format";
import { card, td, th } from "@/lib/ui";
import type { Client, Expense, Invoice, Project, RecurringCost } from "@/lib/types";

type Row = { label: string; get: (p: Projection) => number; bold?: boolean; muted?: boolean };

const rows: Row[] = [
  { label: "Recurring clients (retainers + hosting)", get: (p) => p.recurringRevenue },
  { label: "Booked projects (unpaid balance)", get: (p) => p.bookedRevenue },
  { label: "Expected new sites (assumption)", get: (p) => p.expectedRevenue },
  { label: "Total income", get: (p) => p.revenue, bold: true },
  { label: "Recurring costs", get: (p) => p.recurringCosts, muted: true },
  { label: "One-off expenses", get: (p) => p.oneOffCosts, muted: true },
  { label: "Direct cost of new sites", get: (p) => p.siteCosts, muted: true },
  { label: "Total expenses", get: (p) => p.expenses, bold: true },
  { label: "Before tax", get: (p) => p.beforeTax, bold: true },
  { label: "Estimated tax", get: (p) => p.tax, muted: true },
  { label: "After tax", get: (p) => p.afterTax, bold: true },
];

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

export default async function ProjectionPage() {
  const sb = await supabaseServer();
  const today = todayBoise();
  const monthStart = today.slice(0, 7) + "-01";

  const [settings, cl, pr, inv, ex, rc] = await Promise.all([
    getSettings(sb),
    sb.from("clients").select("*"),
    sb.from("projects").select("*"),
    sb.from("invoices").select("*"),
    sb.from("expenses").select("*").gte("incurred_on", monthStart),
    sb.from("recurring_costs").select("*").eq("active", true),
  ]);

  const data = {
    clients: (cl.data ?? []) as Client[],
    projects: (pr.data ?? []) as Project[],
    invoices: (inv.data ?? []) as Invoice[],
    expenses: (ex.data ?? []) as Expense[],
    recurring: (rc.data ?? []) as RecurringCost[],
    settings,
    today,
  };

  const periods = buildPeriods(today);
  const results = periods.map((p) => project(p, data));
  const twelve = results[3];
  const monthlyCosts = data.recurring.reduce((s, r) => s + monthlyEquivalent(Number(r.amount), r.cadence), 0);
  const taxPct = Math.round(settings.tax_rate * 1000) / 10;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Projection</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat title="Next 12 months, before tax" value={usd(twelve.beforeTax)} sub={"income " + usd(twelve.revenue) + " minus expenses " + usd(twelve.expenses)} />
        <Stat title="Next 12 months, after tax" value={usd(twelve.afterTax)} sub={"at " + taxPct + "% estimated tax"} />
        <Stat title="Average per month, after tax" value={usd(twelve.afterTax / 12)} sub={"recurring costs run " + usd(monthlyCosts) + " a month"} />
      </div>

      <div className={card + " overflow-x-auto p-0"}>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className={th}></th>
              {periods.map((p) => (
                <th key={p.key} className={th + " text-right"}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={"border-b border-stone-100 last:border-0" + (r.bold ? " bg-stone-50" : "")}>
                <td className={td + (r.bold ? " font-semibold" : "") + (r.muted ? " text-stone-500" : "")}>{r.label}</td>
                {results.map((p, i) => {
                  const v = r.get(p);
                  return (
                    <td
                      key={periods[i].key}
                      className={td + " text-right" + (r.bold ? " font-semibold" : "") + (r.muted ? " text-stone-500" : "") + (v < 0 ? " text-red-700" : "")}
                    >
                      {usd(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 text-xs text-stone-500">
        <p>
          <strong>Income</strong> counts every active client&apos;s monthly retainer and hosting, the unpaid balance of planned and active website and drone
          projects (in the month they are due), and the new sites you expect to sell: {settings.new_sites_per_month} a month at{" "}
          {usd(settings.avg_site_price)}. If you have entered every upcoming site as a project, set expected sites to 0 on the Settings page so they are not counted twice.
        </p>
        <p>
          <strong>Expenses</strong> include active recurring costs, one-off expenses dated inside each window, and {usd(settings.direct_cost_per_site)} of
          direct cost per new site. Yearly costs are spread evenly across 12 months, so they show up as one-twelfth each month.
        </p>
        <p>
          <strong>Tax</strong> is a flat {taxPct}% of profit, a placeholder until you set the rate your accountant gives you. It does not model S-corp salary
          and payroll tax. Change the rate and other assumptions on the{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          page, and add monthly or yearly expenses on the{" "}
          <Link href="/money" className="underline">
            Money
          </Link>{" "}
          page. Clients are assumed to stay, so this does not account for churn.
        </p>
      </div>
    </div>
  );
}

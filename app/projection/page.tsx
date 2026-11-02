import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { buildPeriods, monthKeys, monthlyCostFor, project, type Projection } from "@/lib/projection";
import { todayBoise, usd } from "@/lib/format";
import { card, td, th } from "@/lib/ui";
import type { Client, Expense, Invoice, Project, RecurringCost } from "@/lib/types";

type Row = { label: string; get: (p: Projection) => number; bold?: boolean; muted?: boolean };

const rows: Row[] = [
  { label: "Recurring clients (retainers + hosting)", get: (p) => p.recurringRevenue },
  { label: "Booked projects (unpaid balance)", get: (p) => p.bookedRevenue },
  { label: "Expected new sites (assumption)", get: (p) => p.expectedRevenue },
  { label: "Total income", get: (p) => p.revenue, bold: true },
  { label: "Subscriptions and recurring costs", get: (p) => p.recurringCosts, muted: true },
  { label: "One-off expenses", get: (p) => p.oneOffCosts, muted: true },
  { label: "Direct cost of new sites", get: (p) => p.siteCosts, muted: true },
  { label: "Total expenses", get: (p) => p.expenses, bold: true },
  { label: "Business profit, before tax", get: (p) => p.beforeTax, bold: true },
  { label: "Owner salary", get: (p) => p.salary, muted: true },
  { label: "Employer payroll tax", get: (p) => p.employerTax, muted: true },
  { label: "Profit passed through to you", get: (p) => p.distributions },
  { label: "Employee payroll tax", get: (p) => p.employeeTax, muted: true },
  { label: "Income tax (federal + state estimate)", get: (p) => p.incomeTax, muted: true },
  { label: "Take-home, after tax", get: (p) => p.afterTax, bold: true },
  { label: "Total taxes (all three)", get: (p) => p.totalTaxes, muted: true },
];

const monthLabel = (m: string) =>
  new Date(m + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

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
  const currentMonth = today.slice(0, 7);
  const historyStart = monthKeys(today, -6, 1)[0] + "-01";

  const [settings, cl, pr, inv, ex, rc] = await Promise.all([
    getSettings(sb),
    sb.from("clients").select("*"),
    sb.from("projects").select("*"),
    sb.from("invoices").select("*"),
    sb.from("expenses").select("*").gte("incurred_on", historyStart),
    sb.from("recurring_costs").select("*"),
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
  const pctText = (v: number) => Math.round(v * 1000) / 10 + "%";

  // Costs month by month: six months back, this month, and eleven ahead.
  const history = monthKeys(today, -6, 18).map((month) => {
    const recurring = monthlyCostFor(data.recurring, month);
    const oneOff = data.expenses.filter((e) => e.incurred_on.slice(0, 7) === month).reduce((s, e) => s + Number(e.amount), 0);
    return { month, recurring, oneOff, total: recurring + oneOff };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Projection</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat title="12 months, business profit" value={usd(twelve.beforeTax)} sub="before owner pay and taxes" />
        <Stat title="12 months, take-home" value={usd(twelve.afterTax)} sub="after all taxes" />
        <Stat title="Average take-home / month" value={usd(twelve.afterTax / 12)} sub="next 12 months" />
        <Stat title="12 months, total taxes" value={usd(twelve.totalTaxes)} sub="payroll (both shares) + income tax" />
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

      <section className="space-y-2">
        <h2 className="font-semibold">Costs month by month</h2>
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={th}>Month</th>
                <th className={th + " text-right"}>Subscriptions</th>
                <th className={th + " text-right"}>One-off</th>
                <th className={th + " text-right"}>Total</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.month} className={"border-b border-stone-100 last:border-0" + (h.month === currentMonth ? " bg-stone-50 font-semibold" : "")}>
                  <td className={td}>
                    {monthLabel(h.month)}
                    <span className="ml-2 text-xs font-normal text-stone-400">
                      {h.month < currentMonth ? "past" : h.month === currentMonth ? "this month" : "projected"}
                    </span>
                  </td>
                  <td className={td + " text-right"}>{usd(h.recurring)}</td>
                  <td className={td + " text-right"}>{usd(h.oneOff)}</td>
                  <td className={td + " text-right"}>{usd(h.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500">
          A canceled subscription stays in every month from its start through its last month, so past months show what you actually paid. Direct costs of new sites are not in this table.
        </p>
      </section>

      <div className="space-y-2 text-xs text-stone-500">
        <p>
          <strong>Income</strong> counts every active client&apos;s monthly retainer and hosting, the unpaid balance of planned and active website and drone
          projects (in the month they are due), and the new sites you expect to sell: {settings.new_sites_per_month} a month at{" "}
          {usd(settings.avg_site_price)}. If you have entered every upcoming site as a project, set expected sites to 0 on the Settings page so they are not counted twice.
        </p>
        <p>
          <strong>Taxes</strong> follow an S-corp: the business pays you a salary of {usd(settings.owner_salary)} a year plus the employer payroll tax on it (
          {pctText(settings.employer_payroll_rate)}). What is left after that passes through to you. Your {pctText(settings.employee_payroll_rate)} share of payroll
          tax comes out of the salary, and income tax of {pctText(settings.income_tax_rate)} applies to salary plus pass-through profit. These rates are placeholders,
          so confirm your salary and rates with your accountant. The model ignores the Social Security wage cap, the standard deduction, and the 20% pass-through
          deduction, so fold those into the income tax rate. Change everything on the{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          page, and add subscriptions and expenses on the{" "}
          <Link href="/money" className="underline">
            Money
          </Link>{" "}
          page. Clients are assumed to stay, so this does not account for churn.
        </p>
      </div>
    </div>
  );
}

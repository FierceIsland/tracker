import type { Client, Expense, Invoice, Project, RecurringCost } from "./types";
import type { Settings } from "./settings";
import { monthlyEquivalent } from "./format";

export type Period = { key: string; label: string; months: string[] };

export type Projection = {
  recurringRevenue: number;
  bookedRevenue: number;
  expectedRevenue: number;
  revenue: number;
  recurringCosts: number;
  oneOffCosts: number;
  siteCosts: number;
  expenses: number;
  beforeTax: number; // business profit before owner pay and taxes
  salary: number;
  employerTax: number;
  distributions: number; // profit passed through to the owner after salary and employer payroll tax
  employeeTax: number;
  incomeTax: number;
  totalTaxes: number;
  afterTax: number; // owner take-home after all taxes
};

type Data = {
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  expenses: Expense[];
  recurring: RecurringCost[];
  settings: Settings;
  today: string; // YYYY-MM-DD
};

// "YYYY-MM" keys, starting `start` months from the current month.
export function monthKeys(today: string, start: number, count: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1 + start + i, 1)).toISOString().slice(0, 7));
}

// Windows always start at the current month.
export function buildPeriods(today: string): Period[] {
  const [y, m] = today.split("-").map(Number);
  return [
    { key: "m1", label: "This month", months: monthKeys(today, 0, 1) },
    { key: "m3", label: "Next 3 months", months: monthKeys(today, 0, 3) },
    { key: "m6", label: "Next 6 months", months: monthKeys(today, 0, 6) },
    { key: "m12", label: "Next 12 months", months: monthKeys(today, 0, 12) },
    { key: "year", label: "Rest of " + y, months: monthKeys(today, 0, 13 - m) },
  ];
}

// A subscription counts in every month from its start month through its end month, inclusive.
// Canceling sets an end date, so months it was charged keep showing. A legacy "paused" row with
// no dates is treated as no longer charged.
export function chargedInMonth(r: RecurringCost, month: string): boolean {
  const start = (r.started_on ?? r.created_at ?? "").slice(0, 7);
  if (start && month < start) return false;
  if (r.ended_on) return month <= r.ended_on.slice(0, 7);
  return r.active !== false;
}

// Yearly subscriptions are spread evenly across the months they run.
export function monthlyCostFor(recurring: RecurringCost[], month: string): number {
  return recurring.filter((r) => chargedInMonth(r, month)).reduce((s, r) => s + monthlyEquivalent(Number(r.amount), r.cadence), 0);
}

export function project(period: Period, d: Data): Projection {
  const n = period.months.length;
  const months = new Set(period.months);
  const currentMonth = d.today.slice(0, 7);
  const s = d.settings;

  // Recurring income: every active client's retainer plus hosting, each month.
  const mrr = d.clients
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + Number(c.monthly_price ?? 0) + Number(c.hosting_price ?? 0), 0);
  const recurringRevenue = mrr * n;

  // Booked one-time projects: unpaid balance, counted in the month they are due (or started).
  const invoiced = new Map<string, number>();
  for (const inv of d.invoices) {
    if (inv.project_id) invoiced.set(inv.project_id, (invoiced.get(inv.project_id) ?? 0) + Number(inv.amount));
  }
  let bookedRevenue = 0;
  let bookedSites = 0;
  for (const p of d.projects) {
    if (!["planned", "active"].includes(p.status)) continue;
    if (!["website", "drone"].includes(p.kind)) continue;
    const remaining = Math.max(0, Number(p.price ?? 0) - (invoiced.get(p.id) ?? 0));
    if (remaining <= 0) continue;
    let key = (p.due_on ?? p.started_on ?? d.today).slice(0, 7);
    if (key < currentMonth) key = currentMonth; // overdue work still lands this month
    if (!months.has(key)) continue;
    bookedRevenue += remaining;
    if (p.kind === "website") bookedSites += 1;
  }

  // Assumption: new sites you expect to sell but have not entered yet.
  const expectedSites = s.new_sites_per_month * n;
  const expectedRevenue = expectedSites * s.avg_site_price;
  const revenue = recurringRevenue + bookedRevenue + expectedRevenue;

  // Expenses: subscriptions by the months they ran, dated one-offs, and per-site direct costs.
  const recurringCosts = period.months.reduce((sum, m) => sum + monthlyCostFor(d.recurring, m), 0);
  const oneOffCosts = d.expenses
    .filter((e) => months.has(e.incurred_on.slice(0, 7)))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const siteCosts = (bookedSites + expectedSites) * s.direct_cost_per_site;
  const expenses = recurringCosts + oneOffCosts + siteCosts;

  // S-corp taxes. The business pays the owner a salary and the employer share of payroll tax.
  // What is left passes through to the owner as profit. Income tax applies to salary plus
  // pass-through profit; the employee share of payroll tax comes out of the salary.
  const beforeTax = revenue - expenses;
  const salary = (s.owner_salary * n) / 12;
  const employerTax = salary * s.employer_payroll_rate;
  const distributions = beforeTax - salary - employerTax;
  const employeeTax = salary * s.employee_payroll_rate;
  const incomeTax = Math.max(0, salary + distributions) * s.income_tax_rate;
  const totalTaxes = employerTax + employeeTax + incomeTax;
  const afterTax = salary + distributions - employeeTax - incomeTax;

  return {
    recurringRevenue,
    bookedRevenue,
    expectedRevenue,
    revenue,
    recurringCosts,
    oneOffCosts,
    siteCosts,
    expenses,
    beforeTax,
    salary,
    employerTax,
    distributions,
    employeeTax,
    incomeTax,
    totalTaxes,
    afterTax,
  };
}

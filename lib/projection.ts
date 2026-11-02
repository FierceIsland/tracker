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
  beforeTax: number;
  tax: number;
  afterTax: number;
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

// Windows always start at the current month.
export function buildPeriods(today: string): Period[] {
  const [y, m] = today.split("-").map(Number);
  const keys = (count: number) =>
    Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7));
  return [
    { key: "m1", label: "This month", months: keys(1) },
    { key: "m3", label: "Next 3 months", months: keys(3) },
    { key: "m6", label: "Next 6 months", months: keys(6) },
    { key: "m12", label: "Next 12 months", months: keys(12) },
    { key: "year", label: "Rest of " + y, months: keys(13 - m) },
  ];
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

  // Expenses: recurring costs (annual ones spread evenly), dated one-offs, and per-site direct costs.
  const monthlyCosts = d.recurring
    .filter((r) => r.active)
    .reduce((sum, r) => sum + monthlyEquivalent(Number(r.amount), r.cadence), 0);
  const recurringCosts = monthlyCosts * n;
  const oneOffCosts = d.expenses
    .filter((e) => months.has(e.incurred_on.slice(0, 7)))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const siteCosts = (bookedSites + expectedSites) * s.direct_cost_per_site;
  const expenses = recurringCosts + oneOffCosts + siteCosts;

  const beforeTax = revenue - expenses;
  const tax = Math.max(0, beforeTax) * s.tax_rate;
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
    tax,
    afterTax: beforeTax - tax,
  };
}

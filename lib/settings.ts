import type { SupabaseClient } from "@supabase/supabase-js";

export type Settings = {
  planned: Record<string, number>; // planned hours per month, by bucket key
  target_site_hours: number;
  target_retainer_hours: number; // per retainer client per month
  owner_pay_target: number;
  // S-corp tax model
  owner_salary: number; // annual W-2 salary paid to the owner
  employer_payroll_rate: number; // employer share of payroll tax, as a fraction of salary
  employee_payroll_rate: number; // employee share, withheld from salary
  income_tax_rate: number; // effective federal + state income tax on salary + pass-through profit
  // Revenue assumptions
  new_sites_per_month: number; // expected new sites not yet entered as projects
  avg_site_price: number;
  direct_cost_per_site: number; // excludes payment processing, which is a separate percentage
  processing_fee_rate: number; // payment processing fee as a fraction of all income
};

// Defaults come from the pricing model: 2 sites a month at 10 hours, retainers about 67 hours.
// The tax numbers are placeholders until an accountant gives the real ones.
export const DEFAULT_SETTINGS: Settings = {
  planned: {
    site_build: 20,
    seo: 25,
    aeo_geo: 20,
    gbp: 5,
    reviews: 4,
    ads: 13,
    drone: 0,
    package_covered: 10,
    sales: 25,
    calls: 10,
    admin: 8,
    building: 15,
    buffer: 7,
  },
  target_site_hours: 10,
  target_retainer_hours: 6,
  owner_pay_target: 200000,
  owner_salary: 80000,
  employer_payroll_rate: 0.0765,
  employee_payroll_rate: 0.0765,
  income_tax_rate: 0.24,
  new_sites_per_month: 2,
  avg_site_price: 4500,
  direct_cost_per_site: 1350,
  processing_fee_rate: 0.03,
};

export const RETAINER_BUCKETS = ["seo", "aeo_geo", "gbp", "reviews", "ads"];

export async function getSettings(sb: SupabaseClient): Promise<Settings> {
  const { data } = await sb.from("model_settings").select("settings").maybeSingle();
  const s = (data?.settings ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    planned: { ...DEFAULT_SETTINGS.planned, ...(s.planned ?? {}) },
  };
}

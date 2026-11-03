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
  processing_fee_rate: number; // payment processing fee as a fraction of all income
  // Costs charged only when a new site is built. Monthly tools are recurring costs instead.
  site_cost_developer: number;
  site_cost_designer: number;
  site_cost_editor: number; // content editor
  site_cost_compute: number;
  site_cost_other: number;
};

// Everything starts blank except the 3% processing fee and the tax rates.
// The payroll rates are the standard 7.65%. The income tax rate is a placeholder to confirm with an accountant.
export const DEFAULT_SETTINGS: Settings = {
  planned: {
    site_build: 0,
    seo: 0,
    aeo_geo: 0,
    gbp: 0,
    reviews: 0,
    ads: 0,
    drone: 0,
    package_covered: 0,
    sales: 0,
    calls: 0,
    admin: 0,
    building: 0,
    buffer: 0,
  },
  target_site_hours: 0,
  target_retainer_hours: 0,
  owner_pay_target: 0,
  owner_salary: 0,
  employer_payroll_rate: 0.0765,
  employee_payroll_rate: 0.0765,
  income_tax_rate: 0.24,
  new_sites_per_month: 0,
  avg_site_price: 0,
  processing_fee_rate: 0.03,
  site_cost_developer: 0,
  site_cost_designer: 0,
  site_cost_editor: 0,
  site_cost_compute: 0,
  site_cost_other: 0,
};

export const RETAINER_BUCKETS = ["seo", "aeo_geo", "gbp", "reviews", "ads"];

export const siteCostTotal = (s: Settings) =>
  s.site_cost_developer + s.site_cost_designer + s.site_cost_editor + s.site_cost_compute + s.site_cost_other;

export async function getSettings(sb: SupabaseClient): Promise<Settings> {
  const { data } = await sb.from("model_settings").select("settings").maybeSingle();
  const s = (data?.settings ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    planned: { ...DEFAULT_SETTINGS.planned, ...(s.planned ?? {}) },
  };
}

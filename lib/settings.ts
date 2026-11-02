import type { SupabaseClient } from "@supabase/supabase-js";

export type Settings = {
  planned: Record<string, number>; // planned hours per month, by bucket key
  target_site_hours: number;
  target_retainer_hours: number; // per retainer client per month
  owner_pay_target: number;
  tax_rate: number; // estimated tax as a fraction of profit, e.g. 0.25
  new_sites_per_month: number; // expected new sites not yet entered as projects
  avg_site_price: number;
  direct_cost_per_site: number;
};

// Defaults come from the pricing model: 2 sites a month at 10 hours, retainers about 67 hours.
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
  tax_rate: 0.25, // placeholder: replace with the rate your accountant gives you
  new_sites_per_month: 2,
  avg_site_price: 4500,
  direct_cost_per_site: 1500,
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

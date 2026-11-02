import { supabaseServer } from "@/lib/supabase/server";
import { saveSettings } from "../actions";
import { getSettings } from "@/lib/settings";
import { button, card, input, label } from "@/lib/ui";
import type { Bucket } from "@/lib/types";

const pct = (v: number) => Math.round(v * 1000) / 10;

export default async function SettingsPage() {
  const sb = await supabaseServer();
  const [settings, b] = await Promise.all([getSettings(sb), sb.from("buckets").select("*").order("sort")]);
  const buckets = (b.data ?? []) as Bucket[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="text-sm text-stone-600">
        Plan numbers from your pricing model. The dashboard compares logged hours against them, and the Projection page uses the money assumptions.
      </p>

      <form action={saveSettings} className={card + " space-y-5"}>
        <div>
          <h2 className="mb-2 text-sm font-semibold">S-corp taxes</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={label}>Owner salary (per year)</label>
              <input name="owner_salary" type="number" step="1000" min="0" defaultValue={settings.owner_salary} className={input} />
            </div>
            <div>
              <label className={label}>Employer payroll tax (%)</label>
              <input name="employer_payroll_pct" type="number" step="0.01" min="0" max="100" defaultValue={pct(settings.employer_payroll_rate)} className={input} />
            </div>
            <div>
              <label className={label}>Employee payroll tax (%)</label>
              <input name="employee_payroll_pct" type="number" step="0.01" min="0" max="100" defaultValue={pct(settings.employee_payroll_rate)} className={input} />
            </div>
            <div>
              <label className={label}>Income tax, federal + state (%)</label>
              <input name="income_tax_pct" type="number" step="0.5" min="0" max="100" defaultValue={pct(settings.income_tax_rate)} className={input} />
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            These are placeholders. Your accountant can tell you a reasonable salary and your effective income tax rate. Income tax applies to salary plus the profit passed through to you.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Projection assumptions</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={label}>Expected new sites / month</label>
              <input name="new_sites_per_month" type="number" step="0.5" min="0" defaultValue={settings.new_sites_per_month} className={input} />
            </div>
            <div>
              <label className={label}>Average site price</label>
              <input name="avg_site_price" type="number" step="100" min="0" defaultValue={settings.avg_site_price} className={input} />
            </div>
            <div>
              <label className={label}>Direct cost per new site</label>
              <input name="direct_cost_per_site" type="number" step="50" min="0" defaultValue={settings.direct_cost_per_site} className={input} />
            </div>
            <div>
              <label className={label}>Payment processing fee (%)</label>
              <input name="processing_fee_pct" type="number" step="0.1" min="0" max="100" defaultValue={pct(settings.processing_fee_rate)} className={input} />
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Set expected sites to 0 if you add every upcoming site as a project. Direct cost per site leaves out payment processing, which is the separate percentage on all income.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label}>Owner pay target</label>
            <input name="owner_pay_target" type="number" step="1000" defaultValue={settings.owner_pay_target} className={input} />
          </div>
          <div>
            <label className={label}>Target hours per site</label>
            <input name="target_site_hours" type="number" step="0.5" defaultValue={settings.target_site_hours} className={input} />
          </div>
          <div>
            <label className={label}>Target hours per retainer client / mo</label>
            <input name="target_retainer_hours" type="number" step="0.5" defaultValue={settings.target_retainer_hours} className={input} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Planned hours per month, by bucket</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {buckets.map((x) => (
              <div key={x.key}>
                <label className={label}>{x.label}</label>
                <input name={"planned_" + x.key} type="number" step="0.5" min="0" defaultValue={settings.planned[x.key] ?? 0} className={input} />
              </div>
            ))}
          </div>
        </div>

        <button className={button}>Save settings</button>
      </form>
    </div>
  );
}

import { supabaseServer } from "@/lib/supabase/server";
import { resetSettings, saveSettings } from "../actions";
import { getSettings, siteCostTotal } from "@/lib/settings";
import { usd } from "@/lib/format";
import { button, card, ghostButton, input, label } from "@/lib/ui";
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
        The dashboard compares logged hours against your plan, and the Projection page uses the money settings below.
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
            Payroll tax is the standard 7.65% each for the employer and the employee (the Social Security part stops at a yearly wage cap). The income tax rate is a placeholder, so confirm it and your salary with your accountant. Income tax applies to salary plus the profit passed through to you.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Cost per new site</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={label}>Developer</label>
              <input name="site_cost_developer" type="number" step="25" min="0" defaultValue={settings.site_cost_developer} className={input} />
            </div>
            <div>
              <label className={label}>Designer</label>
              <input name="site_cost_designer" type="number" step="25" min="0" defaultValue={settings.site_cost_designer} className={input} />
            </div>
            <div>
              <label className={label}>Claude compute</label>
              <input name="site_cost_compute" type="number" step="25" min="0" defaultValue={settings.site_cost_compute} className={input} />
            </div>
            <div>
              <label className={label}>Other</label>
              <input name="site_cost_other" type="number" step="25" min="0" defaultValue={settings.site_cost_other} className={input} />
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Total per new site: {usd(siteCostTotal(settings))}. These costs are charged only in a month when a new site is built, either one of your booked website projects or an expected new site. Monthly tools like Figma and Adobe are different: add them on the Money page as recurring costs, since they come out every month no matter what.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Projection assumptions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>Expected new sites / month</label>
              <input name="new_sites_per_month" type="number" step="0.5" min="0" defaultValue={settings.new_sites_per_month} className={input} />
            </div>
            <div>
              <label className={label}>Average site price</label>
              <input name="avg_site_price" type="number" step="100" min="0" defaultValue={settings.avg_site_price} className={input} />
            </div>
            <div>
              <label className={label}>Payment processing fee (%)</label>
              <input name="processing_fee_pct" type="number" step="0.1" min="0" max="100" defaultValue={pct(settings.processing_fee_rate)} className={input} />
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Leave expected sites at 0 if you add every upcoming site as a project. Payment processing is taken out of all income.
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

      <form action={resetSettings} className={card + " flex flex-wrap items-center justify-between gap-3"}>
        <p className="text-xs text-stone-500">Clear every saved setting back to its starting value: blank, except the 3% processing fee and the tax rates. This does not touch clients, costs, or time.</p>
        <button className={ghostButton}>Clear all settings</button>
      </form>
    </div>
  );
}

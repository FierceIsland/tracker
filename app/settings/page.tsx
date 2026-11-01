import { supabaseServer } from "@/lib/supabase/server";
import { saveSettings } from "../actions";
import { getSettings } from "@/lib/settings";
import { button, card, input, label } from "@/lib/ui";
import type { Bucket } from "@/lib/types";

export default async function SettingsPage() {
  const sb = await supabaseServer();
  const [settings, b] = await Promise.all([getSettings(sb), sb.from("buckets").select("*").order("sort")]);
  const buckets = (b.data ?? []) as Bucket[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="text-sm text-stone-600">
        These are the plan numbers from your pricing model. The dashboard compares your logged hours against them.
      </p>

      <form action={saveSettings} className={card + " space-y-5"}>
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
            <input
              name="target_retainer_hours"
              type="number"
              step="0.5"
              defaultValue={settings.target_retainer_hours}
              className={input}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Planned hours per month, by bucket</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {buckets.map((x) => (
              <div key={x.key}>
                <label className={label}>{x.label}</label>
                <input
                  name={"planned_" + x.key}
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={settings.planned[x.key] ?? 0}
                  className={input}
                />
              </div>
            ))}
          </div>
        </div>

        <button className={button}>Save settings</button>
      </form>
    </div>
  );
}

import { supabaseServer } from "@/lib/supabase/server";
import { addClient } from "../actions";
import { button, card, input, label, td, th } from "@/lib/ui";
import { usd } from "@/lib/format";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  const sb = await supabaseServer();
  const { data } = await sb.from("clients").select("*").order("name");
  const clients = (data ?? []) as Client[];
  const mrr = clients
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + Number(c.monthly_price ?? 0) + Number(c.hosting_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Clients</h1>
        <p className="text-sm text-stone-600">Active monthly revenue: {usd(mrr)}</p>
      </div>

      <form action={addClient} className={card + " grid gap-3 sm:grid-cols-6"}>
        <div className="sm:col-span-2">
          <label className={label}>Name</label>
          <input name="name" required className={input} />
        </div>
        <div>
          <label className={label}>Trade</label>
          <input name="trade" placeholder="Roofing" className={input} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" className={input} defaultValue="active">
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Package</label>
          <input name="package" placeholder="Growth, Full Stack, SEO only" className={input} />
        </div>
        <div>
          <label className={label}>Retainer / mo</label>
          <input name="monthly_price" type="number" step="1" min="0" defaultValue="0" className={input} />
        </div>
        <div>
          <label className={label}>Hosting / mo</label>
          <input name="hosting_price" type="number" step="1" min="0" defaultValue="0" className={input} />
        </div>
        <div>
          <label className={label}>Started</label>
          <input name="started_on" type="date" className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notes</label>
          <input name="notes" className={input} />
        </div>
        <div className="flex items-end">
          <button className={button + " w-full"}>Add client</button>
        </div>
      </form>

      <div className={card + " overflow-x-auto p-0"}>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className={th}>Client</th>
              <th className={th}>Trade</th>
              <th className={th}>Status</th>
              <th className={th}>Package</th>
              <th className={th}>Retainer</th>
              <th className={th}>Hosting</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-stone-100 last:border-0">
                <td className={td + " font-medium"}>{c.name}</td>
                <td className={td}>{c.trade}</td>
                <td className={td}>{c.status}</td>
                <td className={td}>{c.package}</td>
                <td className={td}>{usd(Number(c.monthly_price ?? 0))}</td>
                <td className={td}>{usd(Number(c.hosting_price ?? 0))}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td className={td + " text-stone-500"} colSpan={6}>
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

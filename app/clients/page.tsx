import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { addClient } from "../actions";
import { termsForMonth } from "@/lib/clientTerms";
import { button, card, input, label, td, th } from "@/lib/ui";
import { hrs, todayBoise, usd } from "@/lib/format";
import type { Client, ClientTerm } from "@/lib/types";

export default async function ClientsPage() {
  const sb = await supabaseServer();
  const first = todayBoise().slice(0, 7) + "-01";
  const [c, t, ex, tm] = await Promise.all([
    sb.from("clients").select("*").order("name"),
    sb.from("client_terms").select("*"),
    sb.from("expenses").select("client_id,amount").not("client_id", "is", null).gte("incurred_on", first),
    sb.from("time_entries").select("client_id,hours").not("client_id", "is", null).gte("entry_date", first),
  ]);
  const costBy = new Map<string, number>();
  for (const e of (ex.data ?? []) as { client_id: string; amount: number }[]) costBy.set(e.client_id, (costBy.get(e.client_id) ?? 0) + Number(e.amount));
  const hoursBy = new Map<string, number>();
  for (const e of (tm.data ?? []) as { client_id: string; hours: number }[]) hoursBy.set(e.client_id, (hoursBy.get(e.client_id) ?? 0) + Number(e.hours));
  const clients = (c.data ?? []) as Client[];
  const history = (t.data ?? []) as ClientTerm[];
  const thisMonth = todayBoise().slice(0, 7);

  const rows = clients.map((x) => ({ client: x, terms: termsForMonth(x, history, thisMonth) }));
  const mrr = rows.reduce((sum, r) => sum + (r.terms ? r.terms.monthly + r.terms.hosting : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Clients</h1>
        <p className="text-sm text-stone-600">Monthly revenue now: {usd(mrr)}</p>
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
          <input name="started_on" type="date" defaultValue={todayBoise()} className={input} />
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
              <th className={th}>Package now</th>
              <th className={th}>Retainer</th>
              <th className={th}>Hosting</th>
              <th className={th}>Costs this month</th>
              <th className={th}>Hours this month</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client: x, terms }) => (
              <tr key={x.id} className={"border-b border-stone-100 last:border-0" + (terms ? "" : " text-stone-400")}>
                <td className={td + " font-medium"}><Link href={`/clients/${x.id}`} className="underline">{x.name}</Link></td>
                <td className={td}>{x.trade}</td>
                <td className={td}>{x.status}</td>
                <td className={td}>{terms?.package ?? ""}</td>
                <td className={td}>{terms ? usd(terms.monthly) : ""}</td>
                <td className={td}>{terms ? usd(terms.hosting) : ""}</td>
                <td className={td}>{costBy.get(x.id) ? usd(costBy.get(x.id)!) : ""}</td>
                <td className={td}>{hoursBy.get(x.id) ? hrs(hoursBy.get(x.id)!) : ""}</td>
                <td className={td}>
                  <Link href={`/clients/${x.id}`} className="text-xs underline">
                    Edit / history
                  </Link>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td className={td + " text-stone-500"} colSpan={9}>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { changePlan, deleteTerms, updateClient } from "../../actions";
import { termsForMonth } from "@/lib/clientTerms";
import { button, card, ghostButton, input, label, td, th } from "@/lib/ui";
import { todayBoise, usd } from "@/lib/format";
import type { Client, ClientTerm } from "@/lib/types";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [c, t] = await Promise.all([
    sb.from("clients").select("*").eq("id", id).maybeSingle(),
    sb
      .from("client_terms")
      .select("*")
      .eq("client_id", id)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  const client = c.data as Client | null;
  if (!client) notFound();
  const history = (t.data ?? []) as ClientTerm[];
  const today = todayBoise();
  const now = termsForMonth(client, history, today.slice(0, 7));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-xs text-stone-500 underline">
          All clients
        </Link>
        <h1 className="text-xl font-bold">{client.name}</h1>
        <p className="text-sm text-stone-600">
          {now
            ? `Right now: ${now.package ?? "no package"}, ${usd(now.monthly)}/mo retainer + ${usd(now.hosting)}/mo hosting`
            : "Not billing right now"}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Change plan</h2>
        <form action={changePlan} className={card + " grid gap-3 sm:grid-cols-6"}>
          <input type="hidden" name="client_id" value={client.id} />
          <div className="sm:col-span-2">
            <label className={label}>Package</label>
            <input name="package" defaultValue={now?.package ?? client.package ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Retainer / mo</label>
            <input name="monthly_price" type="number" step="1" min="0" defaultValue={now?.monthly ?? 0} className={input} />
          </div>
          <div>
            <label className={label}>Hosting / mo</label>
            <input name="hosting_price" type="number" step="1" min="0" defaultValue={now?.hosting ?? 0} className={input} />
          </div>
          <div>
            <label className={label}>Starts on</label>
            <input name="effective_from" type="date" defaultValue={today} required className={input} />
          </div>
          <div>
            <label className={label}>Note</label>
            <input name="note" placeholder="Upgraded to Full Stack" className={input} />
          </div>
          <div className="sm:col-span-6">
            <button className={button}>Save plan change</button>
          </div>
          <p className="text-xs text-stone-500 sm:col-span-6">
            The new plan applies from the month of the start date. Earlier months keep the plan they were on, so past income does not change.
          </p>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Plan history</h2>
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={th}>From</th>
                <th className={th}>Package</th>
                <th className={th}>Retainer</th>
                <th className={th}>Hosting</th>
                <th className={th}>Note</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-stone-100 last:border-0">
                  <td className={td}>{h.effective_from}</td>
                  <td className={td}>{h.package}</td>
                  <td className={td}>{usd(Number(h.monthly_price))}</td>
                  <td className={td}>{usd(Number(h.hosting_price))}</td>
                  <td className={td + " text-stone-500"}>{h.note}</td>
                  <td className={td}>
                    <form action={deleteTerms}>
                      <input type="hidden" name="id" value={h.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <button className={ghostButton}>Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td className={td + " text-stone-500"} colSpan={6}>
                    No history yet. Saving a plan change creates it, starting with the plan the client is on now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Details</h2>
        <form action={updateClient} className={card + " grid gap-3 sm:grid-cols-6"}>
          <input type="hidden" name="id" value={client.id} />
          <div className="sm:col-span-2">
            <label className={label}>Name</label>
            <input name="name" required defaultValue={client.name} className={input} />
          </div>
          <div>
            <label className={label}>Trade</label>
            <input name="trade" defaultValue={client.trade ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Status</label>
            <select name="status" defaultValue={client.status} className={input}>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </div>
          <div>
            <label className={label}>Started</label>
            <input name="started_on" type="date" defaultValue={client.started_on ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Last month billed</label>
            <input name="ended_on" type="date" defaultValue={client.ended_on ?? ""} className={input} />
          </div>
          <div className="sm:col-span-6">
            <label className={label}>Notes</label>
            <input name="notes" defaultValue={client.notes ?? ""} className={input} />
          </div>
          <div className="sm:col-span-6">
            <button className={button}>Save details</button>
          </div>
          <p className="text-xs text-stone-500 sm:col-span-6">
            For a paused or churned client, set the last month they were billed. That month still counts, and later months do not. Leave it empty to use today. Active clients ignore this field.
          </p>
        </form>
      </section>
    </div>
  );
}

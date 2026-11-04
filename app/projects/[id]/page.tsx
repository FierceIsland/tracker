import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { addExpense, addInvoice, addTime, deleteProject, updateProject } from "../../actions";
import { button, card, ghostButton, input, label, td, th } from "@/lib/ui";
import { hrs, todayBoise, usd } from "@/lib/format";
import { planIncomeToDate } from "@/lib/clientTerms";
import { getSettings } from "@/lib/settings";
import { stats } from "@/lib/projectStats";
import type { Bucket, Client, ClientTerm, Expense, Invoice, Project, TimeEntry } from "@/lib/types";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [p, c, t, ex, inv, bk] = await Promise.all([
    sb.from("projects").select("*").eq("id", id).maybeSingle(),
    sb.from("clients").select("id,name").order("name"),
    sb.from("time_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }),
    sb.from("expenses").select("*").eq("project_id", id).order("incurred_on", { ascending: false }),
    sb.from("invoices").select("*").eq("project_id", id).order("issued_on", { ascending: false }),
    sb.from("buckets").select("*").order("sort"),
  ]);
  const buckets = (bk.data ?? []) as Bucket[];
  const timeRows = (t.data ?? []) as TimeEntry[];
  const expRows = (ex.data ?? []) as Expense[];
  const invRows = (inv.data ?? []) as Invoice[];
  const project = p.data as Project | null;
  if (!project) notFound();
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const sum = (rows: { amount?: number; hours?: number }[] | null, key: "amount" | "hours") =>
    (rows ?? []).reduce((s, r) => s + Number(r[key] ?? 0), 0);
  const hours = sum(t.data, "hours");
  const costs = sum(ex.data, "amount");
  const invoiced = sum(inv.data, "amount");
  const price = Number(project.price ?? 0);
  let planIncome = 0;
  if (project.kind === "retainer" && project.client_id) {
    const [oc, ot] = await Promise.all([
      sb.from("clients").select("*").eq("id", project.client_id).maybeSingle(),
      sb.from("client_terms").select("*").eq("client_id", project.client_id),
    ]);
    if (oc.data) planIncome = planIncomeToDate(oc.data as Client, (ot.data ?? []) as ClientTerm[], todayBoise());
  }
  const settings = await getSettings(sb);
  const st = stats(invoiced + planIncome, costs, hours, Number(settings.processing_fee_rate ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-xs text-stone-500 underline">
          All projects
        </Link>
        <h1 className="text-xl font-bold">{project.name}</h1>
        <p className="text-sm text-stone-600">
          {project.kind === "retainer" ? `Plan income to date ${usd(planIncome)}` : `Price ${usd(price)} · invoiced ${usd(invoiced)} · balance ${usd(price - invoiced)}`} · costs {usd(costs)} · left over {usd(st.net)} · {hrs(hours)} hours
          {st.perHour != null ? ` · ${usd(st.perHour)}/hr` : ""}
        </p>
      </div>

      <form action={updateProject} className={card + " grid gap-3 sm:grid-cols-6"}>
        <input type="hidden" name="id" value={project.id} />
        <div className="sm:col-span-2">
          <label className={label}>Project name</label>
          <input name="name" required defaultValue={project.name} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Client</label>
          <select name="client_id" defaultValue={project.client_id ?? ""} className={input}>
            <option value="">None</option>
            {clients.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Type</label>
          <select name="kind" defaultValue={project.kind} className={input}>
            <option value="website">Website</option>
            <option value="retainer">Retainer</option>
            <option value="drone">Drone</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={project.status} className={input}>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className={label}>Price</label>
          <input name="price" type="number" step="1" min="0" defaultValue={price} className={input} />
        </div>
        <div>
          <label className={label}>Budget hours</label>
          <input name="budget_hours" type="number" step="0.5" min="0" defaultValue={project.budget_hours ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Start</label>
          <input name="started_on" type="date" defaultValue={project.started_on ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Due</label>
          <input name="due_on" type="date" defaultValue={project.due_on ?? ""} className={input} />
        </div>
        <div className="sm:col-span-6">
          <button className={button}>Save changes</button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Log against this project</h2>
        <p className="text-xs text-stone-500">Anything added here is tied to this project and to {clients.find((x) => x.id === project.client_id)?.name ?? "no client"}. Balance left to invoice: {usd(price - invoiced)}.</p>
        <div className="grid gap-3 lg:grid-cols-3">
          <form action={addTime} className={card + " space-y-2"}>
            <input type="hidden" name="project_id" value={project.id} />
            <div className="font-medium text-sm">Time</div>
            <input name="entry_date" type="date" defaultValue={todayBoise()} className={input} />
            <select name="bucket_key" className={input}>{buckets.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
            <input name="hours" type="number" step="0.25" min="0.25" max="24" required placeholder="Hours" className={input} />
            <input name="notes" placeholder="Notes" className={input} />
            <button className={button}>Log time</button>
          </form>
          <form action={addExpense} className={card + " space-y-2"}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="kind" value="direct" />
            <div className="font-medium text-sm">Expense</div>
            <input name="vendor" required placeholder="Vendor" className={input} />
            <input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" className={input} />
            <input name="incurred_on" type="date" defaultValue={todayBoise()} className={input} />
            <input type="hidden" name="category" value="other" />
            <button className={button}>Add expense</button>
          </form>
          <form action={addInvoice} className={card + " space-y-2"}>
            <input type="hidden" name="project_id" value={project.id} />
            <div className="font-medium text-sm">Invoice</div>
            <input name="amount" type="number" step="0.01" min="0" required defaultValue={Math.max(0, price - invoiced) || ""} placeholder="Amount" className={input} />
            <input name="description" placeholder="Description" className={input} />
            <input name="issued_on" type="date" defaultValue={todayBoise()} className={input} />
            <button className={button}>Add invoice</button>
          </form>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Everything on this project</h2>
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full">
            <thead className="border-b border-stone-200"><tr><th className={th}>Date</th><th className={th}>Kind</th><th className={th}>Detail</th><th className={th}>Amount / hours</th></tr></thead>
            <tbody>
              {[
                ...timeRows.map((r) => ({ d: r.entry_date, k: "Time", t: r.bucket_key + (r.notes ? " · " + r.notes : ""), v: hrs(Number(r.hours)), h: `/time/${r.id}` })),
                ...expRows.map((r) => ({ d: r.incurred_on, k: "Expense", t: r.vendor, v: "-" + usd(Number(r.amount)), h: `/money/expenses/${r.id}` })),
                ...invRows.map((r) => ({ d: r.issued_on, k: "Invoice", t: r.description ?? r.number ?? "", v: usd(Number(r.amount)), h: `/money/invoices/${r.id}` })),
              ].sort((a, b) => b.d.localeCompare(a.d)).map((r, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className={td}>{r.d}</td><td className={td}>{r.k}</td>
                  <td className={td}><Link href={r.h} className="underline">{r.t || "(no detail)"}</Link></td>
                  <td className={td}>{r.v}</td>
                </tr>
              ))}
              {timeRows.length + expRows.length + invRows.length === 0 && <tr><td className={td + " text-stone-500"} colSpan={4}>Nothing logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <form action={deleteProject} className="space-y-1">
        <input type="hidden" name="id" value={project.id} />
        <button className={ghostButton}>Delete this project</button>
        <p className="text-xs text-stone-500">Time, invoices, and expenses tied to it stay in your books and just lose the project link.</p>
      </form>
    </div>
  );
}

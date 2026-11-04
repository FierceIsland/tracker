import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { addProject, setProjectStatus } from "../actions";
import { button, card, ghostButton, input, label, td, th } from "@/lib/ui";
import { hrs, usd } from "@/lib/format";
import type { Client, Project } from "@/lib/types";

export default async function ProjectsPage() {
  const sb = await supabaseServer();
  const [p, c, t, ex] = await Promise.all([
    sb.from("projects").select("*").order("created_at", { ascending: false }),
    sb.from("clients").select("id,name").order("name"),
    sb.from("time_entries").select("project_id,hours").not("project_id", "is", null),
    sb.from("expenses").select("project_id,amount").not("project_id", "is", null),
  ]);
  const projects = (p.data ?? []) as Project[];
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const logged = new Map<string, number>();
  for (const e of (t.data ?? []) as { project_id: string; hours: number }[]) {
    logged.set(e.project_id, (logged.get(e.project_id) ?? 0) + Number(e.hours));
  }
  const costs = new Map<string, number>();
  for (const e of (ex.data ?? []) as { project_id: string; amount: number }[]) {
    costs.set(e.project_id, (costs.get(e.project_id) ?? 0) + Number(e.amount));
  }
  const clientName = (id: string | null) => clients.find((x) => x.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Projects</h1>

      <form action={addProject} className={card + " grid gap-3 sm:grid-cols-6"}>
        <div className="sm:col-span-2">
          <label className={label}>Project name</label>
          <input name="name" required className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Client</label>
          <select name="client_id" className={input} defaultValue="">
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
          <select name="kind" className={input} defaultValue="website">
            <option value="website">Website</option>
            <option value="retainer">Retainer</option>
            <option value="drone">Drone</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" className={input} defaultValue="active">
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className={label}>Price</label>
          <input name="price" type="number" step="1" min="0" defaultValue="0" className={input} />
        </div>
        <div>
          <label className={label}>Budget hours</label>
          <input name="budget_hours" type="number" step="0.5" min="0" placeholder="10" className={input} />
        </div>
        <div>
          <label className={label}>Start</label>
          <input name="started_on" type="date" className={input} />
        </div>
        <div>
          <label className={label}>Due</label>
          <input name="due_on" type="date" className={input} />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button className={button + " w-full"}>Add project</button>
        </div>
      </form>

      <div className={card + " overflow-x-auto p-0"}>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className={th}>Project</th>
              <th className={th}>Client</th>
              <th className={th}>Type</th>
              <th className={th}>Price</th>
              <th className={th}>Costs</th>
              <th className={th}>After costs</th>
              <th className={th}>Hours</th>
              <th className={th}>Budget</th>
              <th className={th}>$/hr</th>
              <th className={th}>Status</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((x) => {
              const h = logged.get(x.id) ?? 0;
              const cost = costs.get(x.id) ?? 0;
              const price = Number(x.price ?? 0);
              const over = x.budget_hours != null && h > Number(x.budget_hours);
              return (
                <tr key={x.id} className="border-b border-stone-100 last:border-0">
                  <td className={td + " font-medium"}><Link href={`/projects/${x.id}`} className="underline">{x.name}</Link></td>
                  <td className={td}>{x.client_id ? <Link href={`/clients/${x.client_id}`} className="underline">{clientName(x.client_id)}</Link> : ""}</td>
                  <td className={td}>{x.kind}</td>
                  <td className={td}>{usd(price)}</td>
                  <td className={td}>{cost ? usd(cost) : ""}</td>
                  <td className={td}>{price > 0 || cost > 0 ? usd(price - cost) : ""}</td>
                  <td className={td + (over ? " font-semibold text-red-700" : "")}>{hrs(h)}</td>
                  <td className={td}>{x.budget_hours != null ? hrs(Number(x.budget_hours)) : ""}</td>
                  <td className={td}>{h > 0 && price > 0 ? usd((price - cost) / h) : ""}</td>
                  <td className={td}>
                    <form action={setProjectStatus} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={x.id} />
                      <select name="status" defaultValue={x.status} className="rounded border border-stone-300 px-1 py-0.5 text-xs">
                        <option value="planned">planned</option>
                        <option value="active">active</option>
                        <option value="done">done</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                      <button className={ghostButton}>Save</button>
                    </form>
                  </td>
                  <td className={td}>
                    <Link href={`/projects/${x.id}`} className={ghostButton}>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td className={td + " text-stone-500"} colSpan={11}>
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">
        Costs are the expenses you tag to a project on the Money page. $/hr is price minus those costs, divided by hours logged so far. Retainer projects have no price here, because retainer income comes from the client&apos;s plan.
      </p>
    </div>
  );
}

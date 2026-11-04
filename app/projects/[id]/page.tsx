import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteProject, updateProject } from "../../actions";
import { button, card, ghostButton, input, label } from "@/lib/ui";
import { hrs, usd } from "@/lib/format";
import type { Client, Project } from "@/lib/types";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [p, c, t, ex, inv] = await Promise.all([
    sb.from("projects").select("*").eq("id", id).maybeSingle(),
    sb.from("clients").select("id,name").order("name"),
    sb.from("time_entries").select("hours").eq("project_id", id),
    sb.from("expenses").select("amount").eq("project_id", id),
    sb.from("invoices").select("amount").eq("project_id", id),
  ]);
  const project = p.data as Project | null;
  if (!project) notFound();
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const sum = (rows: { amount?: number; hours?: number }[] | null, key: "amount" | "hours") =>
    (rows ?? []).reduce((s, r) => s + Number(r[key] ?? 0), 0);
  const hours = sum(t.data, "hours");
  const costs = sum(ex.data, "amount");
  const invoiced = sum(inv.data, "amount");
  const price = Number(project.price ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-xs text-stone-500 underline">
          All projects
        </Link>
        <h1 className="text-xl font-bold">{project.name}</h1>
        <p className="text-sm text-stone-600">
          Price {usd(price)} · invoiced {usd(invoiced)} · costs {usd(costs)} · after costs {usd(price - costs)} · {hrs(hours)} hours logged
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

      <form action={deleteProject} className="space-y-1">
        <input type="hidden" name="id" value={project.id} />
        <button className={ghostButton}>Delete this project</button>
        <p className="text-xs text-stone-500">Time, invoices, and expenses tied to it stay in your books and just lose the project link.</p>
      </form>
    </div>
  );
}

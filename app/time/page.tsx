import { supabaseServer } from "@/lib/supabase/server";
import { addTime, deleteTime } from "../actions";
import { button, card, ghostButton, input, label, td, th } from "@/lib/ui";
import { hrs, todayBoise } from "@/lib/format";
import type { Bucket, Client, Project, TimeEntry } from "@/lib/types";

export default async function TimePage() {
  const sb = await supabaseServer();
  const [b, p, c, t] = await Promise.all([
    sb.from("buckets").select("*").order("sort"),
    sb.from("projects").select("*").in("status", ["planned", "active"]).order("name"),
    sb.from("clients").select("id,name"),
    sb.from("time_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(60),
  ]);
  const buckets = (b.data ?? []) as Bucket[];
  const projects = (p.data ?? []) as Project[];
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const entries = (t.data ?? []) as TimeEntry[];

  const clientName = (id: string | null) => clients.find((x) => x.id === id)?.name ?? "";
  const projectName = (id: string | null) => projects.find((x) => x.id === id)?.name ?? (id ? "(closed project)" : "");
  const bucketLabel = (key: string) => buckets.find((x) => x.key === key)?.label ?? key;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Time</h1>

      <form action={addTime} className={card + " grid gap-3 sm:grid-cols-6"}>
        <div>
          <label className={label}>Date</label>
          <input name="entry_date" type="date" defaultValue={todayBoise()} required className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Bucket</label>
          <select name="bucket_key" required className={input}>
            {buckets.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Project (optional)</label>
          <select name="project_id" className={input} defaultValue="">
            <option value="">None</option>
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.client_id ? " (" + clientName(x.client_id) + ")" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Hours</label>
          <input name="hours" type="number" step="0.25" min="0.25" max="24" required className={input} />
        </div>
        <div className="sm:col-span-5">
          <label className={label}>Notes</label>
          <input name="notes" className={input} />
        </div>
        <div className="flex items-end">
          <button className={button + " w-full"}>Log time</button>
        </div>
      </form>

      <div className={card + " overflow-x-auto p-0"}>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Bucket</th>
              <th className={th}>Project</th>
              <th className={th}>Hours</th>
              <th className={th}>Notes</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-stone-100 last:border-0">
                <td className={td}>{e.entry_date}</td>
                <td className={td}>{bucketLabel(e.bucket_key)}</td>
                <td className={td}>{projectName(e.project_id)}</td>
                <td className={td}>{hrs(Number(e.hours))}</td>
                <td className={td + " text-stone-500"}>{e.notes}</td>
                <td className={td}>
                  <form action={deleteTime}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className={ghostButton}>Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className={td + " text-stone-500"} colSpan={6}>
                  No time logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { removeTime, updateTime } from "../../actions";
import { button, card, ghostButton, input, label } from "@/lib/ui";
import type { Bucket, Client, Project, TimeEntry } from "@/lib/types";

export default async function EditTimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [e, b, p, c] = await Promise.all([
    sb.from("time_entries").select("*").eq("id", id).maybeSingle(),
    sb.from("buckets").select("*").order("sort"),
    sb.from("projects").select("id,name,client_id").order("name"),
    sb.from("clients").select("id,name").order("name"),
  ]);
  const entry = e.data as TimeEntry | null;
  if (!entry) notFound();
  const buckets = (b.data ?? []) as Bucket[];
  const projects = (p.data ?? []) as Pick<Project, "id" | "name" | "client_id">[];
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/time" className="text-xs text-stone-500 underline">
          All time
        </Link>
        <h1 className="text-xl font-bold">Edit time entry</h1>
      </div>

      <form action={updateTime} className={card + " grid gap-3 sm:grid-cols-6"}>
        <input type="hidden" name="id" value={entry.id} />
        <div>
          <label className={label}>Date</label>
          <input name="entry_date" type="date" defaultValue={entry.entry_date} required className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Bucket</label>
          <select name="bucket_key" defaultValue={entry.bucket_key} required className={input}>
            {buckets.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Client</label>
          <select name="client_id" defaultValue={entry.client_id ?? ""} className={input}>
            <option value="">None</option>
            {clients.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Hours</label>
          <input name="hours" type="number" step="0.25" min="0.25" max="24" defaultValue={Number(entry.hours)} required className={input} />
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Project (sets the client too)</label>
          <select name="project_id" defaultValue={entry.project_id ?? ""} className={input}>
            <option value="">None</option>
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Notes</label>
          <input name="notes" defaultValue={entry.notes ?? ""} className={input} />
        </div>
        <div className="sm:col-span-6">
          <button className={button}>Save changes</button>
        </div>
      </form>

      <form action={removeTime}>
        <input type="hidden" name="id" value={entry.id} />
        <button className={ghostButton}>Delete this entry</button>
      </form>
    </div>
  );
}

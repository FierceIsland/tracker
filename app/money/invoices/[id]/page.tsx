import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { removeInvoice, updateInvoice } from "../../../actions";
import { button, card, ghostButton, input, label } from "@/lib/ui";
import type { Client, Invoice, Project } from "@/lib/types";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [i, c, p] = await Promise.all([
    sb.from("invoices").select("*").eq("id", id).maybeSingle(),
    sb.from("clients").select("id,name").order("name"),
    sb.from("projects").select("id,name").order("name"),
  ]);
  const invoice = i.data as Invoice | null;
  if (!invoice) notFound();
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const projects = (p.data ?? []) as Pick<Project, "id" | "name">[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/money" className="text-xs text-stone-500 underline">
          Money
        </Link>
        <h1 className="text-xl font-bold">Edit invoice</h1>
      </div>

      <form action={updateInvoice} className={card + " grid gap-3 sm:grid-cols-6"}>
        <input type="hidden" name="id" value={invoice.id} />
        <div className="sm:col-span-2">
          <label className={label}>Client</label>
          <select name="client_id" defaultValue={invoice.client_id ?? ""} className={input}>
            <option value="">None</option>
            {clients.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Project (sets the client too)</label>
          <select name="project_id" defaultValue={invoice.project_id ?? ""} className={input}>
            <option value="">None</option>
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Number</label>
          <input name="number" defaultValue={invoice.number ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Amount</label>
          <input name="amount" type="number" step="0.01" min="0" required defaultValue={Number(invoice.amount)} className={input} />
        </div>
        <div className="sm:col-span-4">
          <label className={label}>Description</label>
          <input name="description" defaultValue={invoice.description ?? ""} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Issued</label>
          <input name="issued_on" type="date" defaultValue={invoice.issued_on} className={input} />
        </div>
        <div className="sm:col-span-6">
          <button className={button}>Save changes</button>
        </div>
      </form>

      <form action={removeInvoice}>
        <input type="hidden" name="id" value={invoice.id} />
        <button className={ghostButton}>Delete this invoice</button>
      </form>
    </div>
  );
}

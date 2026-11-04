import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { removeExpense, updateExpense } from "../../../actions";
import { button, card, ghostButton, input, label } from "@/lib/ui";
import type { Client, Expense, Project } from "@/lib/types";

const categories = ["contractor", "software", "compute", "advertising", "office", "insurance", "accounting", "tax", "equipment", "other"];

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [e, c, p] = await Promise.all([
    sb.from("expenses").select("*").eq("id", id).maybeSingle(),
    sb.from("clients").select("id,name").order("name"),
    sb.from("projects").select("id,name").order("name"),
  ]);
  const expense = e.data as Expense | null;
  if (!expense) notFound();
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const projects = (p.data ?? []) as Pick<Project, "id" | "name">[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/money" className="text-xs text-stone-500 underline">
          Money
        </Link>
        <h1 className="text-xl font-bold">Edit expense</h1>
      </div>

      <form action={updateExpense} className={card + " grid gap-3 sm:grid-cols-6"}>
        <input type="hidden" name="id" value={expense.id} />
        <div className="sm:col-span-2">
          <label className={label}>Vendor</label>
          <input name="vendor" required defaultValue={expense.vendor} className={input} />
        </div>
        <div>
          <label className={label}>Category</label>
          <select name="category" defaultValue={expense.category} className={input}>
            {categories.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Type</label>
          <select name="kind" defaultValue={expense.kind} className={input}>
            <option value="direct">Direct (client work)</option>
            <option value="fixed">Fixed overhead</option>
          </select>
        </div>
        <div>
          <label className={label}>Amount</label>
          <input name="amount" type="number" step="0.01" min="0" required defaultValue={Number(expense.amount)} className={input} />
        </div>
        <div>
          <label className={label}>Date</label>
          <input name="incurred_on" type="date" defaultValue={expense.incurred_on} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Client</label>
          <select name="client_id" defaultValue={expense.client_id ?? ""} className={input}>
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
          <select name="project_id" defaultValue={expense.project_id ?? ""} className={input}>
            <option value="">None</option>
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notes</label>
          <input name="notes" defaultValue={expense.notes ?? ""} className={input} />
        </div>
        <div className="sm:col-span-6">
          <button className={button}>Save changes</button>
        </div>
      </form>

      <form action={removeExpense}>
        <input type="hidden" name="id" value={expense.id} />
        <button className={ghostButton}>Delete this expense</button>
      </form>
    </div>
  );
}

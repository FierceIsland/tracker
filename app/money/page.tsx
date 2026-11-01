import { supabaseServer } from "@/lib/supabase/server";
import { addExpense, addInvoice, addRecurring, markInvoicePaid, toggleRecurring } from "../actions";
import { button, card, ghostButton, input, label, td, th } from "@/lib/ui";
import { monthlyEquivalent, todayBoise, usd } from "@/lib/format";
import type { Client, Expense, Invoice, Project, RecurringCost } from "@/lib/types";

const categories = ["contractor", "software", "compute", "advertising", "office", "insurance", "accounting", "tax", "equipment", "other"];

export default async function MoneyPage() {
  const sb = await supabaseServer();
  const [i, e, r, c, p] = await Promise.all([
    sb.from("invoices").select("*").order("issued_on", { ascending: false }).limit(60),
    sb.from("expenses").select("*").order("incurred_on", { ascending: false }).limit(60),
    sb.from("recurring_costs").select("*").order("name"),
    sb.from("clients").select("id,name").order("name"),
    sb.from("projects").select("id,name").order("name"),
  ]);
  const invoices = (i.data ?? []) as Invoice[];
  const expenses = (e.data ?? []) as Expense[];
  const recurring = (r.data ?? []) as RecurringCost[];
  const clients = (c.data ?? []) as Pick<Client, "id" | "name">[];
  const projects = (p.data ?? []) as Pick<Project, "id" | "name">[];
  const clientName = (id: string | null) => clients.find((x) => x.id === id)?.name ?? "";

  const outstanding = invoices.filter((x) => !x.paid_on).reduce((s, x) => s + Number(x.amount), 0);
  const recurringMonthly = recurring
    .filter((x) => x.active)
    .reduce((s, x) => s + monthlyEquivalent(Number(x.amount), x.cadence), 0);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Money</h1>

      {/* Invoices ------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Invoices</h2>
          <p className="text-sm text-stone-600">Outstanding: {usd(outstanding)}</p>
        </div>
        <form action={addInvoice} className={card + " grid gap-3 sm:grid-cols-6"}>
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
          <div className="sm:col-span-2">
            <label className={label}>Project</label>
            <select name="project_id" className={input} defaultValue="">
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
            <input name="number" className={input} />
          </div>
          <div>
            <label className={label}>Amount</label>
            <input name="amount" type="number" step="0.01" min="0" required className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Description</label>
            <input name="description" className={input} />
          </div>
          <div>
            <label className={label}>Issued</label>
            <input name="issued_on" type="date" defaultValue={todayBoise()} className={input} />
          </div>
          <div>
            <label className={label}>Due</label>
            <input name="due_on" type="date" className={input} />
          </div>
          <div>
            <label className={label}>Paid on</label>
            <input name="paid_on" type="date" className={input} />
          </div>
          <div className="flex items-end">
            <button className={button + " w-full"}>Add invoice</button>
          </div>
        </form>
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={th}>Issued</th>
                <th className={th}>Client</th>
                <th className={th}>Description</th>
                <th className={th}>Amount</th>
                <th className={th}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((x) => (
                <tr key={x.id} className="border-b border-stone-100 last:border-0">
                  <td className={td}>{x.issued_on}</td>
                  <td className={td}>{clientName(x.client_id)}</td>
                  <td className={td}>{[x.number, x.description].filter(Boolean).join(" · ")}</td>
                  <td className={td}>{usd(Number(x.amount))}</td>
                  <td className={td}>
                    {x.paid_on ? (
                      x.paid_on
                    ) : (
                      <form action={markInvoicePaid}>
                        <input type="hidden" name="id" value={x.id} />
                        <button className={ghostButton}>Mark paid</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td className={td + " text-stone-500"} colSpan={5}>
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recurring costs ------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Recurring costs</h2>
          <p className="text-sm text-stone-600">Monthly total: {usd(recurringMonthly)}</p>
        </div>
        <form action={addRecurring} className={card + " grid gap-3 sm:grid-cols-6"}>
          <div className="sm:col-span-2">
            <label className={label}>Name</label>
            <input name="name" required placeholder="Figma" className={input} />
          </div>
          <div>
            <label className={label}>Vendor</label>
            <input name="vendor" className={input} />
          </div>
          <div>
            <label className={label}>Amount</label>
            <input name="amount" type="number" step="0.01" min="0" required className={input} />
          </div>
          <div>
            <label className={label}>Cadence</label>
            <select name="cadence" className={input} defaultValue="monthly">
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className={label}>Counts as</label>
            <select name="allocation" className={input} defaultValue="fixed">
              <option value="fixed">Fixed overhead</option>
              <option value="per_site">Per site</option>
              <option value="per_client">Per client</option>
            </select>
          </div>
          <div className="sm:col-span-6">
            <button className={button}>Add recurring cost</button>
          </div>
        </form>
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Vendor</th>
                <th className={th}>Amount</th>
                <th className={th}>Counts as</th>
                <th className={th}>Active</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((x) => (
                <tr key={x.id} className={"border-b border-stone-100 last:border-0" + (x.active ? "" : " text-stone-400")}>
                  <td className={td}>{x.name}</td>
                  <td className={td}>{x.vendor}</td>
                  <td className={td}>
                    {usd(Number(x.amount))} / {x.cadence === "annual" ? "yr" : "mo"}
                  </td>
                  <td className={td}>{x.allocation.replace("_", " ")}</td>
                  <td className={td}>
                    <form action={toggleRecurring}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="active" value={String(!x.active)} />
                      <button className={ghostButton}>{x.active ? "Pause" : "Resume"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {recurring.length === 0 && (
                <tr>
                  <td className={td + " text-stone-500"} colSpan={5}>
                    No recurring costs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* One-off expenses ----------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="font-semibold">One-off expenses</h2>
        <form action={addExpense} className={card + " grid gap-3 sm:grid-cols-6"}>
          <div className="sm:col-span-2">
            <label className={label}>Vendor</label>
            <input name="vendor" required className={input} />
          </div>
          <div>
            <label className={label}>Category</label>
            <select name="category" className={input} defaultValue="other">
              {categories.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Type</label>
            <select name="kind" className={input} defaultValue="direct">
              <option value="direct">Direct (client work)</option>
              <option value="fixed">Fixed overhead</option>
            </select>
          </div>
          <div>
            <label className={label}>Amount</label>
            <input name="amount" type="number" step="0.01" min="0" required className={input} />
          </div>
          <div>
            <label className={label}>Date</label>
            <input name="incurred_on" type="date" defaultValue={todayBoise()} className={input} />
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
          <div className="sm:col-span-2">
            <label className={label}>Project</label>
            <select name="project_id" className={input} defaultValue="">
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
            <input name="notes" className={input} />
          </div>
          <div className="sm:col-span-6">
            <button className={button}>Add expense</button>
          </div>
        </form>
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Vendor</th>
                <th className={th}>Category</th>
                <th className={th}>Type</th>
                <th className={th}>Client</th>
                <th className={th}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x.id} className="border-b border-stone-100 last:border-0">
                  <td className={td}>{x.incurred_on}</td>
                  <td className={td}>{x.vendor}</td>
                  <td className={td}>{x.category}</td>
                  <td className={td}>{x.kind}</td>
                  <td className={td}>{clientName(x.client_id)}</td>
                  <td className={td}>{usd(Number(x.amount))}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td className={td + " text-stone-500"} colSpan={6}>
                    No expenses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

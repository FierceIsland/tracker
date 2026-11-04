"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { toNum, toStr, todayBoise } from "@/lib/format";

// ---- Auth ---------------------------------------------------------------

export async function signIn(formData: FormData) {
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}

// ---- Time ---------------------------------------------------------------

export async function addTime(formData: FormData) {
  const sb = await supabaseServer();
  const projectId = toStr(formData.get("project_id"));
  const clientId = await clientForProject(sb, projectId, toStr(formData.get("client_id")));
  await sb.from("time_entries").insert({
    project_id: projectId,
    client_id: clientId,
    bucket_key: String(formData.get("bucket_key")),
    entry_date: toStr(formData.get("entry_date")) ?? undefined,
    hours: toNum(formData.get("hours")),
    notes: toStr(formData.get("notes")),
  });
  revalidatePath("/time");
  revalidatePath("/");
  revalidatePath("/projects");
}

export async function deleteTime(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("time_entries").delete().eq("id", String(formData.get("id")));
  revalidatePath("/time");
  revalidatePath("/");
  revalidatePath("/projects");
}

// ---- Clients and projects -----------------------------------------------

export async function addClient(formData: FormData) {
  const sb = await supabaseServer();
  const status = String(formData.get("status") ?? "active");
  const startedOn = toStr(formData.get("started_on"));
  const row = {
    name: String(formData.get("name") ?? "").trim(),
    trade: toStr(formData.get("trade")),
    status,
    package: toStr(formData.get("package")),
    monthly_price: toNum(formData.get("monthly_price")),
    hosting_price: toNum(formData.get("hosting_price")),
    started_on: startedOn,
    notes: toStr(formData.get("notes")),
  };
  const { data: created } = await sb.from("clients").insert(row).select("id").single();
  // First row of the plan history, so later changes never rewrite earlier months.
  if (created) {
    await sb.from("client_terms").insert({
      client_id: created.id,
      effective_from: startedOn ?? todayBoise(),
      package: row.package,
      monthly_price: row.monthly_price,
      hosting_price: row.hosting_price,
      note: "Starting terms",
    });
  }
  revalidatePath("/clients");
  revalidatePath("/projection");
  revalidatePath("/");
}

export async function addProject(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("projects").insert({
    name: String(formData.get("name") ?? "").trim(),
    client_id: toStr(formData.get("client_id")),
    kind: String(formData.get("kind") ?? "website"),
    price: toNum(formData.get("price")),
    budget_hours: toStr(formData.get("budget_hours")) ? toNum(formData.get("budget_hours")) : null,
    status: String(formData.get("status") ?? "active"),
    started_on: toStr(formData.get("started_on")),
    due_on: toStr(formData.get("due_on")),
  });
  revalidatePath("/projects");
  revalidatePath("/time");
  revalidatePath("/");
}

export async function setProjectStatus(formData: FormData) {
  const sb = await supabaseServer();
  await sb
    .from("projects")
    .update({ status: String(formData.get("status")) })
    .eq("id", String(formData.get("id")));
  revalidatePath("/projects");
  revalidatePath("/");
}

// ---- Money --------------------------------------------------------------

export async function addInvoice(formData: FormData) {
  const sb = await supabaseServer();
  const invoiceProject = toStr(formData.get("project_id"));
  await sb.from("invoices").insert({
    client_id: await clientForProject(sb, invoiceProject, toStr(formData.get("client_id"))),
    project_id: invoiceProject,
    number: toStr(formData.get("number")),
    description: toStr(formData.get("description")),
    amount: toNum(formData.get("amount")),
    issued_on: toStr(formData.get("issued_on")) ?? undefined,
    due_on: null,
    // An invoice that has gone out counts as done, so there is no separate paid step.
    paid_on: toStr(formData.get("issued_on")) ?? todayBoise(),
  });
  revalidatePath("/money");
  revalidatePath("/");
}

export async function markInvoicePaid(formData: FormData) {
  const sb = await supabaseServer();
  await sb
    .from("invoices")
    .update({ paid_on: new Date().toLocaleDateString("en-CA", { timeZone: "America/Boise" }) })
    .eq("id", String(formData.get("id")));
  revalidatePath("/money");
  revalidatePath("/");
}

export async function addExpense(formData: FormData) {
  const sb = await supabaseServer();
  const expenseProject = toStr(formData.get("project_id"));
  await sb.from("expenses").insert({
    client_id: await clientForProject(sb, expenseProject, toStr(formData.get("client_id"))),
    project_id: expenseProject,
    vendor: String(formData.get("vendor") ?? "").trim(),
    category: String(formData.get("category") ?? "other"),
    kind: String(formData.get("kind") ?? "direct"),
    amount: toNum(formData.get("amount")),
    incurred_on: toStr(formData.get("incurred_on")) ?? undefined,
    notes: toStr(formData.get("notes")),
  });
  revalidatePath("/money");
  revalidatePath("/");
}

export async function addRecurring(formData: FormData) {
  const sb = await supabaseServer();
  const row = {
    name: String(formData.get("name") ?? "").trim(),
    vendor: toStr(formData.get("vendor")),
    amount: toNum(formData.get("amount")),
    cadence: String(formData.get("cadence") ?? "monthly"),
    allocation: String(formData.get("allocation") ?? "fixed"),
  };
  const { error } = await sb.from("recurring_costs").insert({ ...row, started_on: toStr(formData.get("started_on")) });
  // A database without the start/end columns yet: save the cost without a start date.
  if (error) await sb.from("recurring_costs").insert(row);
  revalidatePath("/money");
  revalidatePath("/projection");
  revalidatePath("/");
}

// Ending a subscription keeps it in every month it was charged, through the end month.
export async function cancelRecurring(formData: FormData) {
  const sb = await supabaseServer();
  const id = String(formData.get("id"));
  const { error } = await sb
    .from("recurring_costs")
    .update({ active: false, ended_on: toStr(formData.get("ended_on")) ?? todayBoise() })
    .eq("id", id);
  if (error) await sb.from("recurring_costs").update({ active: false }).eq("id", id);
  revalidatePath("/money");
  revalidatePath("/projection");
  revalidatePath("/");
}

export async function reactivateRecurring(formData: FormData) {
  const sb = await supabaseServer();
  const id = String(formData.get("id"));
  const { error } = await sb.from("recurring_costs").update({ active: true, ended_on: null }).eq("id", id);
  if (error) await sb.from("recurring_costs").update({ active: true }).eq("id", id);
  revalidatePath("/money");
  revalidatePath("/projection");
  revalidatePath("/");
}

export async function deleteRecurring(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("recurring_costs").delete().eq("id", String(formData.get("id")));
  revalidatePath("/money");
  revalidatePath("/projection");
  revalidatePath("/");
}

export async function deleteExpense(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("expenses").delete().eq("id", String(formData.get("id")));
  revalidatePath("/money");
  revalidatePath("/projection");
  revalidatePath("/");
}

// ---- Settings -----------------------------------------------------------

const pct = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, toNum(v))) / 100;

export async function saveSettings(formData: FormData) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const planned: Record<string, number> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS.planned)) {
    planned[key] = toNum(formData.get("planned_" + key));
  }
  await sb.from("model_settings").upsert({
    user_id: user.id,
    settings: {
      planned,
      target_site_hours: toNum(formData.get("target_site_hours")),
      target_retainer_hours: toNum(formData.get("target_retainer_hours")),
      owner_pay_target: toNum(formData.get("owner_pay_target")),
      owner_salary: toNum(formData.get("owner_salary")),
      employer_payroll_rate: pct(formData.get("employer_payroll_pct")),
      employee_payroll_rate: pct(formData.get("employee_payroll_pct")),
      income_tax_rate: pct(formData.get("income_tax_pct")),
      new_sites_per_month: toNum(formData.get("new_sites_per_month")),
      avg_site_price: toNum(formData.get("avg_site_price")),
      site_cost_developer: toNum(formData.get("site_cost_developer")),
      site_cost_designer: toNum(formData.get("site_cost_designer")),
      site_cost_editor: toNum(formData.get("site_cost_editor")),
      site_cost_compute: toNum(formData.get("site_cost_compute")),
      site_cost_other: toNum(formData.get("site_cost_other")),
      processing_fee_rate: pct(formData.get("processing_fee_pct")),
    },
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/settings");
  revalidatePath("/projection");
  revalidatePath("/");
}

// ---- Client edits and plan history ----------------------------------------

export async function updateClient(formData: FormData) {
  const sb = await supabaseServer();
  const id = String(formData.get("id"));
  const status = String(formData.get("status") ?? "active");
  const base = {
    name: String(formData.get("name") ?? "").trim(),
    trade: toStr(formData.get("trade")),
    status,
    started_on: toStr(formData.get("started_on")),
    notes: toStr(formData.get("notes")),
  };
  // Active clients have no end month. Paused or churned ones keep the last month they were billed.
  const endedOn = status === "active" || status === "prospect" ? null : (toStr(formData.get("ended_on")) ?? todayBoise());
  const { error } = await sb.from("clients").update({ ...base, ended_on: endedOn }).eq("id", id);
  // A database without the ended_on column yet: save everything else.
  if (error) await sb.from("clients").update(base).eq("id", id);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/projection");
  revalidatePath("/");
}

// A plan change starts on the date you give. Earlier months keep the earlier plan.
export async function changePlan(formData: FormData) {
  const sb = await supabaseServer();
  const clientId = String(formData.get("client_id"));
  const effectiveFrom = toStr(formData.get("effective_from")) ?? todayBoise();
  const next = {
    package: toStr(formData.get("package")),
    monthly_price: toNum(formData.get("monthly_price")),
    hosting_price: toNum(formData.get("hosting_price")),
  };

  const { data: client } = await sb.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client) return;

  // A client with no history yet: save their old terms first so the past is not rewritten.
  const { count } = await sb.from("client_terms").select("id", { count: "exact", head: true }).eq("client_id", clientId);
  if (!count) {
    const start = client.started_on ?? String(client.created_at).slice(0, 10);
    await sb.from("client_terms").insert({
      client_id: clientId,
      effective_from: start < effectiveFrom ? start : effectiveFrom,
      package: client.package,
      monthly_price: client.monthly_price ?? 0,
      hosting_price: client.hosting_price ?? 0,
      note: "Starting terms",
    });
  }

  await sb.from("client_terms").insert({
    client_id: clientId,
    effective_from: effectiveFrom,
    ...next,
    note: toStr(formData.get("note")),
  });

  // Keep the client's "current" numbers in step once the change has started.
  if (effectiveFrom.slice(0, 7) <= todayBoise().slice(0, 7)) {
    await sb.from("clients").update(next).eq("id", clientId);
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/projection");
  revalidatePath("/");
}

export async function deleteTerms(formData: FormData) {
  const sb = await supabaseServer();
  const clientId = String(formData.get("client_id"));
  await sb.from("client_terms").delete().eq("id", String(formData.get("id")));
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/projection");
  revalidatePath("/");
}

export async function deleteInvoice(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("invoices").delete().eq("id", String(formData.get("id")));
  revalidatePath("/money");
  revalidatePath("/projection");
  revalidatePath("/");
}

// Clears every saved setting, so the defaults (blank, plus the 3% fee) apply again.
export async function resetSettings() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  await sb.from("model_settings").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  revalidatePath("/projection");
  revalidatePath("/");
  redirect("/settings");
}

// ---- Edit and delete: time, projects, invoices, expenses, clients ----------

// A record tied to a project belongs to that project's client. With no project, use the client picked.
async function clientForProject(sb: Awaited<ReturnType<typeof supabaseServer>>, projectId: string | null, fallback: string | null) {
  if (!projectId) return fallback;
  const { data } = await sb.from("projects").select("client_id").eq("id", projectId).maybeSingle();
  return data?.client_id ?? fallback;
}

function refreshAll() {
  for (const p of ["/", "/time", "/clients", "/projects", "/money", "/projection"]) revalidatePath(p);
}

export async function updateTime(formData: FormData) {
  const sb = await supabaseServer();
  const projectId = toStr(formData.get("project_id"));
  await sb
    .from("time_entries")
    .update({
      project_id: projectId,
      client_id: await clientForProject(sb, projectId, toStr(formData.get("client_id"))),
      bucket_key: String(formData.get("bucket_key")),
      entry_date: toStr(formData.get("entry_date")) ?? todayBoise(),
      hours: toNum(formData.get("hours")),
      notes: toStr(formData.get("notes")),
    })
    .eq("id", String(formData.get("id")));
  refreshAll();
  redirect("/time");
}

export async function removeTime(formData: FormData) {
  await deleteTime(formData);
  redirect("/time");
}

export async function updateProject(formData: FormData) {
  const sb = await supabaseServer();
  await sb
    .from("projects")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      client_id: toStr(formData.get("client_id")),
      kind: String(formData.get("kind") ?? "website"),
      price: toNum(formData.get("price")),
      budget_hours: toStr(formData.get("budget_hours")) ? toNum(formData.get("budget_hours")) : null,
      status: String(formData.get("status") ?? "active"),
      started_on: toStr(formData.get("started_on")),
      due_on: toStr(formData.get("due_on")),
    })
    .eq("id", String(formData.get("id")));
  refreshAll();
  redirect("/projects");
}

// Time, invoices, and expenses stay in the books and just lose their project link.
export async function deleteProject(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("projects").delete().eq("id", String(formData.get("id")));
  refreshAll();
  redirect("/projects");
}

export async function updateInvoice(formData: FormData) {
  const sb = await supabaseServer();
  const projectId = toStr(formData.get("project_id"));
  const issued = toStr(formData.get("issued_on")) ?? todayBoise();
  await sb
    .from("invoices")
    .update({
      project_id: projectId,
      client_id: await clientForProject(sb, projectId, toStr(formData.get("client_id"))),
      number: toStr(formData.get("number")),
      description: toStr(formData.get("description")),
      amount: toNum(formData.get("amount")),
      issued_on: issued,
      paid_on: issued,
    })
    .eq("id", String(formData.get("id")));
  refreshAll();
  redirect("/money");
}

export async function removeInvoice(formData: FormData) {
  await deleteInvoice(formData);
  redirect("/money");
}

export async function updateExpense(formData: FormData) {
  const sb = await supabaseServer();
  const projectId = toStr(formData.get("project_id"));
  await sb
    .from("expenses")
    .update({
      project_id: projectId,
      client_id: await clientForProject(sb, projectId, toStr(formData.get("client_id"))),
      vendor: String(formData.get("vendor") ?? "").trim(),
      category: String(formData.get("category") ?? "other"),
      kind: String(formData.get("kind") ?? "direct"),
      amount: toNum(formData.get("amount")),
      incurred_on: toStr(formData.get("incurred_on")) ?? todayBoise(),
      notes: toStr(formData.get("notes")),
    })
    .eq("id", String(formData.get("id")));
  refreshAll();
  redirect("/money");
}

export async function removeExpense(formData: FormData) {
  await deleteExpense(formData);
  redirect("/money");
}

// Plan history goes with the client. Projects, time, invoices, and expenses stay and lose the client link.
export async function deleteClient(formData: FormData) {
  const sb = await supabaseServer();
  await sb.from("clients").delete().eq("id", String(formData.get("id")));
  refreshAll();
  redirect("/clients");
}

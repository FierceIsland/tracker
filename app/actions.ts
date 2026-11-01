"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { toNum, toStr } from "@/lib/format";

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
  let clientId: string | null = null;
  if (projectId) {
    const { data } = await sb.from("projects").select("client_id").eq("id", projectId).maybeSingle();
    clientId = data?.client_id ?? null;
  }
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
  await sb.from("clients").insert({
    name: String(formData.get("name") ?? "").trim(),
    trade: toStr(formData.get("trade")),
    status: String(formData.get("status") ?? "active"),
    package: toStr(formData.get("package")),
    monthly_price: toNum(formData.get("monthly_price")),
    hosting_price: toNum(formData.get("hosting_price")),
    started_on: toStr(formData.get("started_on")),
    notes: toStr(formData.get("notes")),
  });
  revalidatePath("/clients");
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
  await sb.from("invoices").insert({
    client_id: toStr(formData.get("client_id")),
    project_id: toStr(formData.get("project_id")),
    number: toStr(formData.get("number")),
    description: toStr(formData.get("description")),
    amount: toNum(formData.get("amount")),
    issued_on: toStr(formData.get("issued_on")) ?? undefined,
    due_on: toStr(formData.get("due_on")),
    paid_on: toStr(formData.get("paid_on")),
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
  await sb.from("expenses").insert({
    client_id: toStr(formData.get("client_id")),
    project_id: toStr(formData.get("project_id")),
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
  await sb.from("recurring_costs").insert({
    name: String(formData.get("name") ?? "").trim(),
    vendor: toStr(formData.get("vendor")),
    amount: toNum(formData.get("amount")),
    cadence: String(formData.get("cadence") ?? "monthly"),
    allocation: String(formData.get("allocation") ?? "fixed"),
  });
  revalidatePath("/money");
  revalidatePath("/");
}

export async function toggleRecurring(formData: FormData) {
  const sb = await supabaseServer();
  await sb
    .from("recurring_costs")
    .update({ active: String(formData.get("active")) === "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/money");
  revalidatePath("/");
}

// ---- Settings -----------------------------------------------------------

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
    },
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

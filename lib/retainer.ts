import type { SupabaseClient } from "@supabase/supabase-js";

// Every paying client gets one "retainer" project. Its income is the client's plan, so hours and costs
// tagged to it show what the retainer really earns. Safe to call repeatedly.
export async function ensureRetainers(sb: SupabaseClient, clients: { id: string; name: string; status: string }[]) {
  const wanted = clients.filter((c) => c.status !== "prospect");
  if (wanted.length === 0) return;
  const { data } = await sb.from("projects").select("client_id").eq("kind", "retainer").in("client_id", wanted.map((c) => c.id));
  const have = new Set((data ?? []).map((r: { client_id: string }) => r.client_id));
  const missing = wanted.filter((c) => !have.has(c.id));
  if (missing.length === 0) return;
  await sb.from("projects").insert(
    missing.map((c) => ({ name: `${c.name} retainer`, client_id: c.id, kind: "retainer", status: "active", price: 0 })),
  );
}

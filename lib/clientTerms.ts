import type { Client, ClientTerm } from "./types";

export type Terms = { package: string | null; monthly: number; hosting: number };

// The plan a client was on in a given month ("YYYY-MM"), or null if they were not a paying client then.
// A change dated in a month applies from that whole month. Earlier months keep the earlier plan.
export function termsForMonth(client: Client, history: ClientTerm[], month: string): Terms | null {
  if (client.status === "prospect") return null;

  const mine = history
    .filter((h) => h.client_id === client.id)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from) || a.created_at.localeCompare(b.created_at));

  const start = (mine[0]?.effective_from ?? client.started_on ?? client.created_at ?? "").slice(0, 7);
  if (start && month < start) return null;

  // Paused or churned clients stop after their last billed month. With no date, they no longer count.
  if (client.ended_on) {
    if (month > client.ended_on.slice(0, 7)) return null;
  } else if (client.status === "paused" || client.status === "churned") {
    return null;
  }

  let current: ClientTerm | undefined;
  for (const h of mine) {
    if (h.effective_from.slice(0, 7) <= month) current = h;
    else break;
  }
  if (current) {
    return { package: current.package, monthly: Number(current.monthly_price ?? 0), hosting: Number(current.hosting_price ?? 0) };
  }
  // No history rows yet (before the migration): fall back to the client's current numbers.
  if (mine.length === 0) {
    return { package: client.package, monthly: Number(client.monthly_price ?? 0), hosting: Number(client.hosting_price ?? 0) };
  }
  return null;
}

export function clientIncomeFor(clients: Client[], history: ClientTerm[], month: string): number {
  return clients.reduce((sum, c) => {
    const t = termsForMonth(c, history, month);
    return sum + (t ? t.monthly + t.hosting : 0);
  }, 0);
}

// Everything a client's plan has brought in, from their first month through the current one.
export function planIncomeToDate(client: Client, history: ClientTerm[], today: string): number {
  const mine = history.filter((h) => h.client_id === client.id);
  const first = [client.started_on, client.created_at, ...mine.map((h) => h.effective_from)]
    .filter(Boolean)
    .map((d) => (d as string).slice(0, 7))
    .sort()[0];
  if (!first) return 0;
  const end = today.slice(0, 7);
  let [y, m] = first.split("-").map(Number);
  let total = 0;
  for (;;) {
    const mk = `${y}-${String(m).padStart(2, "0")}`;
    if (mk > end) break;
    const t = termsForMonth(client, history, mk);
    if (t) total += t.monthly + t.hosting;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return total;
}

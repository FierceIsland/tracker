export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

export const hrs = (n: number) => (Math.round((n || 0) * 10) / 10).toLocaleString("en-US");

export const todayBoise = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Boise" });

export const monthStart = () => todayBoise().slice(0, 7) + "-01";

export const daysAgo = (days: number) => {
  const d = new Date(todayBoise() + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export const toNum = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const toStr = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

export const monthlyEquivalent = (amount: number, cadence: string) => (cadence === "annual" ? amount / 12 : amount);

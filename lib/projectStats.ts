export type Stats = { income: number; costs: number; fee: number; net: number; hours: number; perHour: number | null };

// Left over = income - costs tagged to it - the processing fee on that income. $/hr = left over / hours logged.
export function stats(income: number, costs: number, hours: number, feeRate: number): Stats {
  const fee = income * feeRate;
  const net = income - costs - fee;
  return { income, costs, fee, net, hours, perHour: hours > 0 ? net / hours : null };
}

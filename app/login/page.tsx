import { signIn } from "../actions";
import { button, card, input, label } from "@/lib/ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-4 text-xl font-bold text-emerald-900">Tracker</h1>
      <form action={signIn} className={card + " space-y-3"}>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label className={label}>Password</label>
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className={button + " w-full"}>Sign in</button>
      </form>
    </div>
  );
}

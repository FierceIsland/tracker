import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Tracker", description: "Hours, bills, and margins" };

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/time", label: "Time" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/money", label: "Money" },
  { href: "/settings", label: "Settings" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {user && (
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
              <span className="font-bold tracking-tight text-emerald-900">Tracker</span>
              <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} className="text-stone-600 hover:text-emerald-900">
                    {l.label}
                  </Link>
                ))}
              </nav>
              <form action={signOut} className="ml-auto">
                <button className="text-xs text-stone-500 hover:text-stone-900">Sign out</button>
              </form>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

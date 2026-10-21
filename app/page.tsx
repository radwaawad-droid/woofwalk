"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      router.replace(u.role === "owner" ? "/owner" : "/walker");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return <div className="p-8 text-center text-ink-500">Loading…</div>;
  }

  return (
    <main className="flex min-h-screen flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600 px-6 pb-14 pt-10 text-white">
        <div className="text-4xl">🐕</div>
        <h1 className="mt-4 text-3xl font-bold leading-tight">
          WoofWalk
        </h1>
        <p className="mt-2 text-sm text-brand-50/90">
          Dog walking on demand in Dubai
        </p>
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </section>

      <section className="flex-1 px-6 py-8">
        <h2 className="text-lg font-semibold">Get started</h2>
        <p className="mt-1 text-sm text-ink-500">
          Create an account to request a walk or start earning as a walker.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/signup?role=owner"
            className="block rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">🐾</div>
              <div className="flex-1">
                <div className="font-semibold">I have a dog</div>
                <div className="mt-0.5 text-sm text-ink-500">
                  Book a trusted walker in minutes
                </div>
              </div>
              <div className="text-ink-300">→</div>
            </div>
          </Link>

          <Link
            href="/signup?role=walker"
            className="block rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">🚶</div>
              <div className="flex-1">
                <div className="font-semibold">I want to walk dogs</div>
                <div className="mt-0.5 text-sm text-ink-500">
                  Earn flexibly on your schedule
                </div>
              </div>
              <div className="text-ink-300">→</div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600">
            Log in
          </Link>
        </div>
      </section>

      <footer className="px-6 pb-8 pt-2 text-center text-xs text-ink-300">
        Made in Dubai · v0.1
      </footer>
    </main>
  );
}

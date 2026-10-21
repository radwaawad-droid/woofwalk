"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getUser } from "@/lib/store";
import { Header } from "@/components/UI";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (u) router.replace(u.role === "owner" ? "/owner" : "/walker");
  }, [router]);

  return (
    <main className="min-h-screen">
      <Header title="Log in" back="/" />
      <div className="space-y-4 px-5 py-6">
        <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
          This demo doesn&apos;t persist accounts across devices yet. In the
          real build, log in is phone + OTP (Supabase Auth).
        </div>

        <p className="text-sm text-ink-500">
          For the demo, if you created an account on this device, you&apos;re
          already logged in. Otherwise create one:
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/signup?role=owner"
            className="rounded-2xl border border-ink-100 bg-white p-4 text-center text-sm font-semibold hover:border-brand-300"
          >
            🐾 Owner
          </Link>
          <Link
            href="/signup?role=walker"
            className="rounded-2xl border border-ink-100 bg-white p-4 text-center text-sm font-semibold hover:border-brand-300"
          >
            🚶 Walker
          </Link>
        </div>
      </div>
    </main>
  );
}

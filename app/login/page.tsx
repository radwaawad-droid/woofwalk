"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyProfile, signInWithEmail } from "@/lib/db";
import { Button, Field, Header, inputCls } from "@/components/UI";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (p) router.replace(p.role === "owner" ? "/owner" : "/walker");
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      const p = await getMyProfile();
      if (!p) {
        setErr(
          "Signed in, but no profile was found. Please sign up again — this account exists in auth but not in the profiles table.",
        );
        return;
      }
      router.replace(p.role === "owner" ? "/owner" : "/walker");
    } catch (e: any) {
      setErr(e?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header title="Log in" back="/" />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-6">
        <Field label="Email">
          <input
            type="email"
            className={inputCls}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            className={inputCls}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        {err && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>

        <div className="pt-4 text-center text-sm text-ink-500">
          New here?{" "}
          <Link href="/signup?role=owner" className="font-semibold text-brand-600">
            Sign up as owner
          </Link>{" "}
          or{" "}
          <Link href="/signup?role=walker" className="font-semibold text-brand-600">
            as a walker
          </Link>
        </div>
      </form>
    </main>
  );
}

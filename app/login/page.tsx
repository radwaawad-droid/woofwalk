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
          "Signed in, but no profile found. Please sign up again — this account exists in auth but not in profiles.",
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
    <main className="min-h-screen pb-28">
      <Header title="" back="/" />
      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          Log in to pick up where you left off.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-5 px-5 py-6">
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
          <div className="rounded-xl border border-clay/40 bg-bone p-3 text-sm text-clay">
            {err}
          </div>
        )}
      </form>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-paper bg-bone px-5 py-3">
        <Button
          type="button"
          onClick={() =>
            (document.querySelector("form") as HTMLFormElement)?.requestSubmit()
          }
          disabled={loading}
        >
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </nav>

      <p className="px-5 pt-4 text-center text-sm text-stone">
        New here?{" "}
        <Link href="/signup" className="font-medium text-midnight underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </main>
  );
}

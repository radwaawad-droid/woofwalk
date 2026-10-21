"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  addDog,
  createProfile,
  DUBAI_AREAS,
  Role,
  signUpWithEmail,
  signInWithEmail,
} from "@/lib/db";
import { Button, Field, Header, inputCls } from "@/components/UI";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = (params.get("role") as Role) || "owner";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+971 ");
  const [area, setArea] = useState(DUBAI_AREAS[0]);

  // owner-only
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password || !name.trim()) {
      setErr("Email, password and name are required.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await signUpWithEmail(email.trim(), password);
      // In some Supabase projects email confirm is required; sign in to get a session.
      if (!result.session) {
        try {
          await signInWithEmail(email.trim(), password);
        } catch (e: any) {
          throw new Error(
            "Account created, but email confirmation may be required. Check your inbox, then log in.",
          );
        }
      }
      // Now we have a session. Create profile.
      const userId = (await (
        await import("@/lib/supabase")
      ).getSupabase().auth.getUser()).data.user?.id;
      if (!userId) throw new Error("No user id after signup.");

      await createProfile({
        id: userId,
        role,
        name: name.trim(),
        phone: phone.trim(),
        area,
      });

      if (role === "owner" && dogName.trim()) {
        await addDog({
          name: dogName.trim(),
          breed: breed.trim() || "Mixed",
          size,
        });
      }

      router.replace(role === "owner" ? "/owner" : "/walker");
    } catch (e: any) {
      setErr(e?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header
        title={role === "owner" ? "Create owner account" : "Become a walker"}
        back="/"
      />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
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

        <Field label="Password" hint="At least 6 characters">
          <input
            type="password"
            className={inputCls}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <Field label="Your name">
          <input
            className={inputCls}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field label="Phone (UAE)">
          <input
            className={inputCls}
            placeholder="+971 50 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
        </Field>

        <Field label="Area in Dubai">
          <select
            className={inputCls}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            {DUBAI_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        {role === "owner" && (
          <>
            <div className="mt-6 border-t border-ink-100 pt-5">
              <h2 className="text-sm font-semibold text-ink-700">Your dog</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Optional — you can add dogs later.
              </p>
            </div>

            <Field label="Dog's name">
              <input
                className={inputCls}
                placeholder="e.g. Rex"
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
              />
            </Field>

            <Field label="Breed">
              <input
                className={inputCls}
                placeholder="e.g. Labrador"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </Field>

            <Field label="Size">
              <div className="grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize ${
                      size === s
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-ink-100 bg-white text-ink-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {role === "walker" && (
          <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
            After signup, complete your walker profile so owners can learn about
            you. ID verification is required to accept walks (coming soon — for
            demo you&apos;re auto-approved).
          </div>
        )}

        {err && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </div>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-ink-500">Loading…</div>}
    >
      <SignupInner />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
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
import { Button, Field, Header, inputCls, PawIcon } from "@/components/UI";

function RolePicker() {
  return (
    <main className="min-h-screen">
      <Header title="" back="/" />
      <section className="px-5 pt-4 pb-8">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          Who are you?
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          You can switch later. We just need to show you the right screens.
        </p>

        <div className="mt-8 space-y-3">
          <RoleCard
            role="owner"
            title="I have a dog"
            subtitle="Book a trusted walker in minutes"
          />
          <RoleCard
            role="walker"
            title="I want to walk dogs"
            subtitle="Earn flexibly on your schedule"
          />
        </div>

        <p className="mt-8 text-center text-sm text-stone">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-midnight underline underline-offset-2">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}

function RoleCard({
  role,
  title,
  subtitle,
}: {
  role: Role;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={`/signup?role=${role}`}
      className="group flex items-center justify-between rounded-2xl border border-paper bg-bone px-5 py-5 transition hover:border-midnight"
    >
      <div>
        <div className="font-serif text-xl text-midnight">{title}</div>
        <div className="mt-1 text-sm text-midnight/70">{subtitle}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-midnight transition group-hover:bg-midnight group-hover:text-bone">
        <PawIcon className="h-5 w-5" />
      </div>
    </Link>
  );
}

function SignupForm({ role }: { role: Role }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+971 ");
  const [area, setArea] = useState(DUBAI_AREAS[0]);

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
      if (!result.session) {
        try {
          await signInWithEmail(email.trim(), password);
        } catch {
          throw new Error(
            "Account created, but email confirmation may be required. Check your inbox, then log in.",
          );
        }
      }
      const userId = (
        await (await import("@/lib/supabase")).getSupabase().auth.getUser()
      ).data.user?.id;
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
    <main className="min-h-screen pb-32">
      <Header title="" back="/signup" />
      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          {role === "owner" ? "Owner account" : "Walker account"}
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          {role === "owner"
            ? "A few details to book your first walk."
            : "Set up now, add your profile right after."}
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
            <div className="mt-4 pt-4 border-t border-paper">
              <h2 className="font-serif text-base">Your dog</h2>
              <p className="mt-1 text-xs text-stone">
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
                    className={`rounded-full border px-3 py-2.5 text-sm font-medium capitalize transition ${
                      size === s
                        ? "border-midnight bg-midnight text-bone"
                        : "border-chalk bg-bone text-midnight"
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
          <div className="rounded-2xl border border-paper bg-bone p-4 text-sm text-midnight/80">
            After signup, complete your walker profile — a photo and a few lines
            about yourself. Owners book walkers they can see.
          </div>
        )}

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
          {loading ? "Creating…" : "Create account"}
        </Button>
      </nav>
    </main>
  );
}

function SignupInner() {
  const params = useSearchParams();
  const role = params.get("role") as Role | null;
  if (!role) return <RolePicker />;
  if (role !== "owner" && role !== "walker") return <RolePicker />;
  return <SignupForm role={role} />;
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-stone">
          Loading…
        </div>
      }
    >
      <SignupInner />
    </Suspense>
  );
}

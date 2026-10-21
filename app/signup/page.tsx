"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signUp, Role, DUBAI_AREAS, addDog } from "@/lib/store";
import { Button, Field, Header, inputCls } from "@/components/UI";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = (params.get("role") as Role) || "owner";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+971 ");
  const [area, setArea] = useState(DUBAI_AREAS[0]);
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const user = signUp({ name: name.trim(), phone: phone.trim(), role, area });
    if (role === "owner" && dogName.trim()) {
      addDog({
        ownerId: user.id,
        name: dogName.trim(),
        breed: breed.trim() || "Mixed",
        size,
      });
    }
    router.replace(role === "owner" ? "/owner" : "/walker");
  }

  return (
    <main className="min-h-screen">
      <Header title={role === "owner" ? "Create owner account" : "Become a walker"} back="/" />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
        <Field label="Your name">
          <input
            className={inputCls}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field label="Phone (UAE)" hint="We use this to contact you about walks">
          <input
            className={inputCls}
            placeholder="+971 50 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            required
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
            In the real app, walkers go through ID verification before accepting
            walks. For this demo, you&apos;re approved automatically.
          </div>
        )}

        <div className="pt-2">
          <Button type="submit">Create account</Button>
        </div>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-500">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}

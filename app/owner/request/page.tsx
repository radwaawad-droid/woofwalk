"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addDog,
  createWalk,
  Dog,
  DUBAI_AREAS,
  getMyDogs,
  getMyProfile,
  priceFor,
  Profile,
} from "@/lib/db";
import { Button, Field, Header, inputCls } from "@/components/UI";

const DURATIONS = [15, 30, 45, 60];

export default function RequestWalk() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState<string>("");
  const [area, setArea] = useState<string>(DUBAI_AREAS[0]);
  const [address, setAddress] = useState<string>("");
  const [duration, setDuration] = useState<number>(30);

  const [showAddDog, setShowAddDog] = useState(false);
  const [newDog, setNewDog] = useState<{
    name: string;
    breed: string;
    size: "small" | "medium" | "large";
  }>({ name: "", breed: "", size: "medium" });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p || p.role !== "owner") {
        router.replace("/");
        return;
      }
      setProfile(p);
      const ds = await getMyDogs();
      setDogs(ds);
      if (ds[0]) setDogId(ds[0].id);
      else setShowAddDog(true);
      if (p.area) setArea(p.area);
    })();
  }, [router]);

  async function onAddDog() {
    if (!newDog.name.trim()) return;
    const d = await addDog({
      name: newDog.name.trim(),
      breed: newDog.breed.trim() || "Mixed",
      size: newDog.size,
    });
    const ds = await getMyDogs();
    setDogs(ds);
    setDogId(d.id);
    setShowAddDog(false);
    setNewDog({ name: "", breed: "", size: "medium" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!dogId || !address.trim()) return;
    setSubmitting(true);
    try {
      const walk = await createWalk({
        dog_id: dogId,
        area,
        address: address.trim(),
        duration_min: duration,
        price_aed: priceFor(duration),
      });
      router.replace(`/owner/walk/${walk.id}`);
    } catch (e: any) {
      setErr(e?.message || "Could not create walk.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) {
    return <div className="p-8 text-center text-ink-500">Loading…</div>;
  }

  return (
    <main className="min-h-screen pb-28">
      <Header title="Request a walk" back="/owner" />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
        {showAddDog ? (
          <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <div className="text-sm font-semibold text-brand-800">Add a dog</div>
            <Field label="Name">
              <input
                className={inputCls}
                value={newDog.name}
                onChange={(e) => setNewDog({ ...newDog, name: e.target.value })}
                placeholder="e.g. Rex"
                required
              />
            </Field>
            <Field label="Breed">
              <input
                className={inputCls}
                value={newDog.breed}
                onChange={(e) => setNewDog({ ...newDog, breed: e.target.value })}
                placeholder="e.g. Golden Retriever"
              />
            </Field>
            <Field label="Size">
              <div className="grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewDog({ ...newDog, size: s })}
                    className={`rounded-xl border px-3 py-2 text-sm capitalize ${
                      newDog.size === s
                        ? "border-brand-500 bg-white text-brand-800"
                        : "border-ink-100 bg-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Button type="button" onClick={onAddDog} variant="secondary">
              Save dog
            </Button>
          </div>
        ) : (
          <Field label="Dog">
            <div className="grid gap-2">
              {dogs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDogId(d.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left ${
                    dogId === d.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-ink-100 bg-white"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                    🐕
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{d.name}</div>
                    <div className="text-xs text-ink-500">
                      {d.breed || "Mixed"} · {d.size || "medium"}
                    </div>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAddDog(true)}
                className="rounded-xl border border-dashed border-ink-100 bg-white p-3 text-sm text-ink-500"
              >
                + Add another dog
              </button>
            </div>
          </Field>
        )}

        <Field label="Area">
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

        <Field label="Pickup address" hint="Building, apartment, access notes">
          <textarea
            className={inputCls}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Marina Pinnacle Tower, Apt 1203. Buzzer at reception."
            required
          />
        </Field>

        <Field label="Duration">
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-xl border px-2 py-3 text-sm font-semibold ${
                  duration === d
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-ink-100 bg-white"
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </Field>

        <div className="rounded-xl bg-ink-100 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-700">Price</span>
            <span className="text-xl font-bold">AED {priceFor(duration)}</span>
          </div>
          <div className="mt-1 text-xs text-ink-500">
            Payment on completion. Demo mode — no real charge.
          </div>
        </div>

        {err && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>
        )}
      </form>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-ink-100 bg-white px-5 py-3">
        <Button
          type="button"
          onClick={(() => {
            const form = document.querySelector("form");
            form?.requestSubmit();
          }) as any}
          disabled={!dogId || !address.trim() || showAddDog || submitting}
        >
          {submitting ? "Requesting…" : "Request walk"}
        </Button>
      </nav>
    </main>
  );
}

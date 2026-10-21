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
import {
  Button,
  Field,
  Header,
  inputCls,
  PawIcon,
} from "@/components/UI";

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
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  const price = priceFor(duration);

  return (
    <main className="min-h-screen pb-28">
      <Header title="" back="/owner" />

      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          Book a walk.
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          A nearby walker usually accepts within minutes.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-6 px-5 py-6">
        {/* Dog section */}
        <section>
          <SectionLabel>Dog</SectionLabel>
          {showAddDog ? (
            <div className="space-y-4 rounded-2xl border border-paper bg-paper/40 p-4">
              <Field label="Name">
                <input
                  className={inputCls}
                  value={newDog.name}
                  onChange={(e) =>
                    setNewDog({ ...newDog, name: e.target.value })
                  }
                  placeholder="e.g. Rex"
                  required
                />
              </Field>
              <Field label="Breed">
                <input
                  className={inputCls}
                  value={newDog.breed}
                  onChange={(e) =>
                    setNewDog({ ...newDog, breed: e.target.value })
                  }
                  placeholder="e.g. Golden Retriever"
                />
              </Field>
              <Field label="Size">
                <SegmentedGroup
                  options={["small", "medium", "large"]}
                  value={newDog.size}
                  onChange={(s) =>
                    setNewDog({ ...newDog, size: s as any })
                  }
                />
              </Field>
              <Button type="button" onClick={onAddDog} variant="secondary">
                Save dog
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-paper rounded-2xl border border-paper overflow-hidden">
              {dogs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDogId(d.id)}
                  className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition ${
                    dogId === d.id ? "bg-paper/50" : "hover:bg-paper/30"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      dogId === d.id
                        ? "bg-midnight text-bone"
                        : "bg-paper text-midnight/70"
                    }`}
                  >
                    <PawIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-stone">
                      {d.breed || "Mixed"} · {d.size || "medium"}
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border ${
                      dogId === d.id
                        ? "border-midnight bg-midnight"
                        : "border-chalk"
                    }`}
                  >
                    {dogId === d.id && (
                      <svg
                        viewBox="0 0 20 20"
                        className="h-full w-full text-bone"
                        fill="none"
                      >
                        <path
                          d="M5 10l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAddDog(true)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-stone hover:bg-paper/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-chalk text-stone">
                  +
                </div>
                Add another dog
              </button>
            </div>
          )}
        </section>

        {/* Area */}
        <section>
          <SectionLabel>Area</SectionLabel>
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
        </section>

        {/* Address */}
        <section>
          <SectionLabel hint="Building, apartment, access notes">
            Pickup address
          </SectionLabel>
          <textarea
            className={inputCls}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Marina Pinnacle Tower, Apt 1203. Buzzer at reception."
            required
          />
        </section>

        {/* Duration */}
        <section>
          <SectionLabel>Duration</SectionLabel>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-full border py-3 text-sm font-medium transition ${
                  duration === d
                    ? "border-midnight bg-midnight text-bone"
                    : "border-chalk bg-bone text-midnight hover:border-midnight"
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </section>

        {/* Price summary */}
        <section className="rounded-2xl bg-midnight p-5 text-bone">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-lime">
                Total
              </div>
              <div className="mt-1 font-serif text-3xl tracking-tightest">
                AED {price}
              </div>
            </div>
            <div className="text-right text-xs text-bone/70">
              Paid on completion
              <br />
              Demo mode · no real charge
            </div>
          </div>
        </section>

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
          disabled={!dogId || !address.trim() || showAddDog || submitting}
        >
          {submitting ? "Requesting…" : `Request walk · AED ${price}`}
        </Button>
      </nav>
    </main>
  );
}

function SectionLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="font-serif text-base text-midnight">{children}</h2>
      {hint && <span className="text-xs text-stone">{hint}</span>}
    </div>
  );
}

function SegmentedGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full border py-2.5 text-sm font-medium capitalize transition ${
            value === s
              ? "border-midnight bg-midnight text-bone"
              : "border-chalk bg-bone text-midnight hover:border-midnight"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

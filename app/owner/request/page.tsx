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
import { notify } from "@/lib/push";

const DURATIONS = [15, 30, 45, 60];

export default function RequestWalk() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState<string>("");
  const [area, setArea] = useState<string>(DUBAI_AREAS[0]);
  const [community, setCommunity] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [duration, setDuration] = useState<number>(30);
  // Price is editable by the owner. Defaults to the suggested price for the
  // chosen duration, and keeps tracking it until the owner edits it manually.
  const [price, setPrice] = useState<number>(priceFor(30));
  const [priceTouched, setPriceTouched] = useState<boolean>(false);

  const [showAddDog, setShowAddDog] = useState(false);
  const [newDog, setNewDog] = useState<{
    name: string;
    breed: string;
    size: "small" | "medium" | "large";
  }>({ name: "", breed: "", size: "medium" });

  // Scheduling: 'now' = on-demand, 'later' = pick a datetime
  const [when, setWhen] = useState<"now" | "later">("now");
  // Default scheduled datetime: tomorrow at 08:00 local, in the input's required format
  const [scheduledLocal, setScheduledLocal] = useState<string>(() =>
    defaultTomorrowMorning(),
  );

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
      if (p.community) setCommunity(p.community);
    })();
  }, [router]);

  // Keep the suggested price in sync with duration until the owner edits it
  useEffect(() => {
    if (!priceTouched) setPrice(priceFor(duration));
  }, [duration, priceTouched]);

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
    if (!Number.isFinite(price) || price < 30) {
      setErr("Set a price of at least AED 30.");
      return;
    }
    let scheduledIso: string | null = null;
    if (when === "later") {
      // The datetime-local input gives us local wall-clock time; convert to UTC ISO
      const d = new Date(scheduledLocal);
      if (Number.isNaN(d.getTime())) {
        setErr("Pick a valid date and time.");
        return;
      }
      if (d.getTime() < Date.now() + 5 * 60_000) {
        setErr("Schedule at least 5 minutes in the future.");
        return;
      }
      scheduledIso = d.toISOString();
    }
    setSubmitting(true);
    try {
      const walk = await createWalk({
        dog_id: dogId,
        area,
        community: community.trim() || null,
        address: address.trim(),
        duration_min: duration,
        price_aed: Math.round(price),
        scheduled_for: scheduledIso,
      });
      // Fan out to walkers in the area. Await it (not fire-and-forget) so
      // the fetch isn't cancelled by the immediate router.replace below —
      // keepalive=true isn't reliable on iOS Safari during navigation.
      await notify({ walk_id: walk.id, kind: "new_request" });
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

  const suggested = priceFor(duration);

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
                  {d.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.photo_url}
                      alt={d.name}
                      className={`h-11 w-11 rounded-full object-cover ${
                        dogId === d.id ? "ring-2 ring-midnight" : ""
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        dogId === d.id
                          ? "bg-midnight text-bone"
                          : "bg-paper text-midnight/70"
                      }`}
                    >
                      <PawIcon className="h-5 w-5" />
                    </div>
                  )}
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

        {/* Community */}
        <section>
          <SectionLabel hint="Saheel 4, Palmera 2, Marina Pinnacle…">
            Community
          </SectionLabel>
          <input
            className={inputCls}
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            placeholder="e.g. Saheel 4"
          />
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

        {/* When */}
        <section>
          <SectionLabel>When</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWhen("now")}
              className={`rounded-full border py-3 text-sm font-medium transition ${
                when === "now"
                  ? "border-midnight bg-midnight text-bone"
                  : "border-chalk bg-bone text-midnight hover:border-midnight"
              }`}
            >
              Right now
            </button>
            <button
              type="button"
              onClick={() => setWhen("later")}
              className={`rounded-full border py-3 text-sm font-medium transition ${
                when === "later"
                  ? "border-midnight bg-midnight text-bone"
                  : "border-chalk bg-bone text-midnight hover:border-midnight"
              }`}
            >
              Schedule
            </button>
          </div>
          {when === "later" && (
            <div className="mt-3 rounded-2xl border border-paper bg-paper/40 p-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone">
                  Date & time
                </span>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                  min={minScheduleLocal()}
                  required
                />
              </label>
              <p className="mt-2 text-xs text-stone">
                Walkers see scheduled walks ahead of time and reserve them.
              </p>
            </div>
          )}
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

        {/* Price — you set it, walkers accept it */}
        <section className="rounded-2xl bg-midnight p-5 text-bone">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-lime">
                Your offer
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-xl text-bone/60">AED</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={999}
                  step={5}
                  value={price}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPrice(Number.isFinite(v) ? v : 0);
                    setPriceTouched(true);
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Price in AED"
                  className="w-24 bg-transparent border-0 border-b border-bone/30 pb-0.5 font-serif text-4xl tracking-tightest text-bone outline-none focus:border-lime [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-bone/60">
                <span>Typical: AED {suggested}</span>
                {priceTouched && price !== suggested && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrice(suggested);
                      setPriceTouched(false);
                    }}
                    className="rounded-full border border-bone/30 px-2 py-0.5 text-[10px] text-bone/80 hover:bg-bone/10"
                  >
                    Reset
                  </button>
                )}
              </div>
              {priceTouched && price < suggested * 0.75 && price >= 30 && (
                <div className="mt-2 text-[11px] text-amber-200">
                  Low offers may wait longer for a walker to accept.
                </div>
              )}
              {priceTouched && price > suggested * 1.5 && (
                <div className="mt-2 text-[11px] text-lime">
                  Nice bump — walkers will likely accept quickly.
                </div>
              )}
            </div>
            <div className="shrink-0 text-right text-xs text-bone/60">
              Paid on
              <br />
              completion
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

// Format a Date as the string a <input type="datetime-local"> wants:
// YYYY-MM-DDTHH:MM in the device's local timezone (not UTC)
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTomorrowMorning(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toLocalInput(d);
}

function minScheduleLocal(): string {
  const d = new Date(Date.now() + 5 * 60_000);
  return toLocalInput(d);
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

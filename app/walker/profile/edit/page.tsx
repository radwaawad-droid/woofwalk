"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ageFromDOB,
  DUBAI_AREAS,
  getMyProfile,
  getMyWalkerProfile,
  LANGUAGES,
  Profile,
  updateMyProfile,
  uploadWalkerPhoto,
  upsertMyWalkerProfile,
  WalkerProfile,
} from "@/lib/db";
import { Button, Field, Header, inputCls, PawIcon } from "@/components/UI";

export default function WalkerProfileEdit() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wp, setWp] = useState<WalkerProfile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [primaryArea, setPrimaryArea] = useState(DUBAI_AREAS[0]);
  const [bio, setBio] = useState("");
  const [years, setYears] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [langs, setLangs] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dob, setDob] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p || p.role !== "walker") {
        router.replace("/");
        return;
      }
      setProfile(p);
      setName(p.name);
      setPhone(p.phone || "");
      if (p.area) setPrimaryArea(p.area);
      const wpr = await getMyWalkerProfile();
      setWp(wpr);
      if (wpr) {
        setBio(wpr.bio || "");
        setYears(wpr.years_experience ?? "");
        setRate(wpr.hourly_rate_aed ?? "");
        setLangs(wpr.languages || []);
        setAreas(wpr.areas_served || (p.area ? [p.area] : []));
        setPhotoUrl(wpr.photo_url);
        setDob(wpr.date_of_birth || "");
      } else if (p.area) {
        setAreas([p.area]);
      }
    })();
  }, [router]);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadWalkerPhoto(file);
      setPhotoUrl(url);
      await upsertMyWalkerProfile({ photo_url: url });
    } catch (e: any) {
      setErr(e?.message || "Photo upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      await updateMyProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        area: primaryArea,
      });
      await upsertMyWalkerProfile({
        bio: bio.trim() || null,
        years_experience: years === "" ? null : Number(years),
        hourly_rate_aed: rate === "" ? null : Number(rate),
        languages: langs.length ? langs : null,
        areas_served: areas.length ? areas : null,
        photo_url: photoUrl,
        date_of_birth: dob || null,
      });
      setMsg("Saved.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-28">
      <Header title="" back="/walker" />

      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          Your profile.
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          This is what owners see before accepting your walks. A face and a
          few lines go a long way.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-6 px-5 py-6">
        {/* Photo */}
        <section className="flex items-center gap-5">
          <div className="relative">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="You"
                className="h-24 w-24 rounded-full object-cover ring-1 ring-paper"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-paper text-midnight/50">
                <PawIcon className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-midnight px-4 py-2 text-sm font-medium text-midnight transition hover:bg-midnight hover:text-bone disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
            </button>
            <p className="mt-2 text-xs text-stone">
              A clear face photo helps owners trust you.
            </p>
          </div>
        </section>

        {/* Basics */}
        <section className="space-y-4 border-t border-paper pt-6">
          <SectionLabel>Basics</SectionLabel>

          <Field label="Name">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="+971 50 123 4567"
            />
          </Field>

          <Field
            label="Date of birth"
            hint="Shown as your age on your profile."
          >
            <input
              type="date"
              className={inputCls}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={eighteenYearsAgo()}
            />
            {dob && ageFromDOB(dob) !== null && (
              <span className="mt-1 block text-xs text-stone">
                You&apos;ll show as <strong>{ageFromDOB(dob)}</strong>.
              </span>
            )}
          </Field>
        </section>

        {/* About */}
        <section className="space-y-4 border-t border-paper pt-6">
          <SectionLabel>About you</SectionLabel>
          <Field label="A short bio" hint="Why you love walking dogs">
            <textarea
              className={inputCls}
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Grew up with dogs. Walking regularly in Dubai Marina for 2 years — comfortable with all sizes, including reactive dogs."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Years' experience">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={years}
                onChange={(e) =>
                  setYears(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="2"
              />
            </Field>
            <Field label="Rate per walk (AED)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={rate}
                onChange={(e) =>
                  setRate(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="70"
              />
            </Field>
          </div>

          <div>
            <SubLabel>Languages you speak</SubLabel>
            <ChipGroup
              options={LANGUAGES}
              selected={langs}
              onToggle={(l) => setLangs(toggle(langs, l))}
            />
          </div>
        </section>

        {/* Areas */}
        <section className="space-y-4 border-t border-paper pt-6">
          <SectionLabel>Where you walk</SectionLabel>

          <Field label="Primary area">
            <select
              className={inputCls}
              value={primaryArea}
              onChange={(e) => setPrimaryArea(e.target.value)}
            >
              {DUBAI_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <SubLabel>Other areas you&apos;re happy to go to</SubLabel>
            <ChipGroup
              options={DUBAI_AREAS}
              selected={areas}
              onToggle={(a) => setAreas(toggle(areas, a))}
            />
          </div>
        </section>

        {err && (
          <div className="rounded-xl border border-clay/40 bg-bone p-3 text-sm text-clay">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-xl border border-emerald2/40 bg-bone p-3 text-sm text-emerald2">
            {msg}
          </div>
        )}
      </form>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-paper bg-bone px-5 py-3">
        <Button
          type="button"
          onClick={() =>
            (document.querySelector("form") as HTMLFormElement)?.requestSubmit()
          }
          disabled={saving}
        >
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </nav>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-base text-midnight">{children}</h2>;
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium text-stone">{children}</div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-midnight bg-midnight text-bone"
                : "border-chalk bg-bone text-midnight hover:border-midnight"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function eighteenYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

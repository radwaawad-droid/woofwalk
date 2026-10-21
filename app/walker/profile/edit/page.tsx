"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
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
import { Button, Field, Header, inputCls } from "@/components/UI";

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
      // Save immediately so a refresh keeps it
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
    return <div className="p-8 text-center text-ink-500">Loading…</div>;
  }

  return (
    <main className="min-h-screen pb-28">
      <Header title="Your walker profile" back="/walker" />

      <form onSubmit={onSave} className="space-y-5 px-5 py-5">
        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="You"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl">
              🚶
            </div>
          )}
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
              className="rounded-xl bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-800"
              disabled={uploading}
            >
              {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
            </button>
            <p className="mt-1 text-xs text-ink-500">
              A clear face photo helps owners trust you.
            </p>
          </div>
        </div>

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

        <Field label="About you" hint="A few lines on why you love walking dogs">
          <textarea
            className={inputCls}
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. I've grown up with dogs my whole life and have been walking dogs in Dubai Marina for 2 years. I'm comfortable with all sizes including reactive dogs."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Years of experience">
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
          <Field label="Hourly rate (AED)">
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

        <Field label="Languages you speak">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => setLangs(toggle(langs, l))}
                className={`rounded-full border px-3 py-1 text-sm ${
                  langs.includes(l)
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-ink-100 bg-white text-ink-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>

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

        <Field label="Other areas you'll walk in">
          <div className="flex flex-wrap gap-2">
            {DUBAI_AREAS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAreas(toggle(areas, a))}
                className={`rounded-full border px-3 py-1 text-sm ${
                  areas.includes(a)
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-ink-100 bg-white text-ink-700"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>

        {err && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>
        )}
        {msg && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {msg}
          </div>
        )}
      </form>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-ink-100 bg-white px-5 py-3">
        <Button
          type="button"
          onClick={() => (document.querySelector("form") as HTMLFormElement)?.requestSubmit()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </nav>
    </main>
  );
}

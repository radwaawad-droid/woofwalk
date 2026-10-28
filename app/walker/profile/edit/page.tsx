"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ageFromDOB,
  DUBAI_AREAS,
  getMyProfile,
  getMyWalkerProfile,
  getSignedPrivateUrl,
  LANGUAGES,
  Profile,
  updateMyProfile,
  uploadWalkerIdDocument,
  uploadWalkerPhoto,
  upsertMyWalkerProfile,
  WalkerProfile,
} from "@/lib/db";
import { getSupabase } from "@/lib/supabase";
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
  const [payoutsState, setPayoutsState] = useState<{
    connected: boolean;
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  } | null>(null);
  const [payoutsBusy, setPayoutsBusy] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ----- ID verification state -----
  const [idType, setIdType] = useState<"emirates_id" | "passport">("emirates_id");
  const [idFrontUrl, setIdFrontUrl] = useState<string | null>(null); // signed preview URL
  const [idBackUrl, setIdBackUrl] = useState<string | null>(null);
  const [idFrontPath, setIdFrontPath] = useState<string | null>(null);
  const [idBackPath, setIdBackPath] = useState<string | null>(null);
  const [idUploadedAt, setIdUploadedAt] = useState<string | null>(null);
  const [idVerifiedAt, setIdVerifiedAt] = useState<string | null>(null);
  const [idUploadingSide, setIdUploadingSide] = useState<"front" | "back" | null>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);

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
        if (wpr.id_document_type) setIdType(wpr.id_document_type);
        setIdFrontPath(wpr.id_document_front_path);
        setIdBackPath(wpr.id_document_back_path);
        setIdUploadedAt(wpr.id_document_uploaded_at);
        setIdVerifiedAt(wpr.id_verified_at);
        // Pre-fetch signed URLs so the walker can see their uploaded IDs
        if (wpr.id_document_front_path) {
          getSignedPrivateUrl("walker-ids", wpr.id_document_front_path, 120)
            .then((u) => setIdFrontUrl(u))
            .catch(() => {});
        }
        if (wpr.id_document_back_path) {
          getSignedPrivateUrl("walker-ids", wpr.id_document_back_path, 120)
            .then((u) => setIdBackUrl(u))
            .catch(() => {});
        }
      } else if (p.area) {
        setAreas([p.area]);
      }
    })();
  }, [router]);

  async function onPickId(
    side: "front" | "back",
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setIdUploadingSide(side);
    try {
      const path = await uploadWalkerIdDocument(file, side);
      const now = new Date().toISOString();
      // Save path + type on the walker profile
      await upsertMyWalkerProfile({
        id_document_type: idType,
        [side === "front" ? "id_document_front_path" : "id_document_back_path"]: path,
        id_document_uploaded_at: now,
      } as any);
      const signed = await getSignedPrivateUrl("walker-ids", path, 120);
      if (side === "front") {
        setIdFrontPath(path);
        setIdFrontUrl(signed);
      } else {
        setIdBackPath(path);
        setIdBackUrl(signed);
      }
      setIdUploadedAt(now);
      setMsg("ID uploaded. We'll review it shortly.");
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setErr(e?.message || "Couldn't upload the photo. Try again?");
    } finally {
      setIdUploadingSide(null);
      if (side === "front" && idFrontRef.current) idFrontRef.current.value = "";
      if (side === "back" && idBackRef.current) idBackRef.current.value = "";
    }
  }

  async function onIdTypeChange(next: "emirates_id" | "passport") {
    setIdType(next);
    // Save the type right away so later uploads are self-consistent
    try {
      await upsertMyWalkerProfile({ id_document_type: next } as any);
    } catch {}
    // Switching to Passport? Clear the back path since passports don't have one
    if (next === "passport" && idBackPath) {
      try {
        await upsertMyWalkerProfile({ id_document_back_path: null } as any);
        setIdBackPath(null);
        setIdBackUrl(null);
      } catch {}
    }
  }

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function refreshPayoutsState() {
    try {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/stripe/connect-status", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const text = await res.text();
      if (!text) return;
      const json = JSON.parse(text);
      if (json.ok && json.state) setPayoutsState(json.state);
    } catch {
      /* ignore */
    }
  }

  async function startStripeOnboarding() {
    setErr(null);
    setPayoutsBusy(true);
    try {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/stripe/connect-onboard", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!json?.ok) {
        setErr(json?.reason || `Server error (${res.status}).`);
        return;
      }
      // Redirect to Stripe's hosted onboarding
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message || "Could not start payouts setup.");
    } finally {
      setPayoutsBusy(false);
    }
  }

  // Pull payout state on mount; refresh after Stripe returns here
  useEffect(() => {
    refreshPayoutsState();
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("onboarding")
    ) {
      // Give Stripe a beat, then re-fetch
      setTimeout(refreshPayoutsState, 1500);
    }
  }, []);

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

        {/* Payouts — Stripe Connect Express */}
        <section className="space-y-4 border-t border-paper pt-6">
          <SectionLabel>ID verification</SectionLabel>
          <p className="-mt-2 text-sm text-stone">
            Owners trust walkers who are verified. Upload a clear photo of your
            Emirates ID or passport so we can approve your account.
          </p>

          {idVerifiedAt ? (
            <div className="rounded-2xl border border-emerald2/30 bg-paper/40 p-4">
              <div className="font-medium text-emerald2">✓ ID verified</div>
              <p className="mt-1 text-sm text-midnight/80">
                Thanks — your account is verified.
              </p>
            </div>
          ) : idUploadedAt ? (
            <div className="rounded-2xl border border-amber2/30 bg-paper/40 p-4">
              <div className="font-medium text-amber2">Awaiting review</div>
              <p className="mt-1 text-sm text-midnight/80">
                We'll check your ID shortly. You'll be able to accept walks
                once that's done.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-paper bg-paper/40 p-4 text-sm text-midnight/80">
              Required to accept walks.
            </div>
          )}

          <Field label="Document type">
            <select
              value={idType}
              onChange={(e) =>
                onIdTypeChange(e.target.value as "emirates_id" | "passport")
              }
              className={inputCls}
            >
              <option value="emirates_id">Emirates ID</option>
              <option value="passport">Passport</option>
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IdSlot
              label={idType === "emirates_id" ? "Front side" : "Photo page"}
              url={idFrontUrl}
              uploading={idUploadingSide === "front"}
              onPick={() => idFrontRef.current?.click()}
            />
            <input
              ref={idFrontRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPickId("front", e)}
            />

            {idType === "emirates_id" && (
              <>
                <IdSlot
                  label="Back side"
                  url={idBackUrl}
                  uploading={idUploadingSide === "back"}
                  onPick={() => idBackRef.current?.click()}
                />
                <input
                  ref={idBackRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPickId("back", e)}
                />
              </>
            )}
          </div>

          <p className="text-xs text-stone">
            Your ID is stored privately and only visible to Woofwalk admins
            reviewing your application.
          </p>
        </section>

        <section className="space-y-4 border-t border-paper pt-6">
          <SectionLabel>Payouts</SectionLabel>

          {!payoutsState ? (
            <p className="text-sm text-stone">Loading payout status…</p>
          ) : payoutsState.payouts_enabled && payoutsState.charges_enabled ? (
            <div className="rounded-2xl border border-emerald2/30 bg-paper/40 p-4">
              <div className="font-medium text-emerald2">
                ✓ Payouts active
              </div>
              <p className="mt-1 text-sm text-midnight/80">
                Your earnings are paid out to your bank on Stripe&apos;s
                schedule (daily by default). Nothing more to do here.
              </p>
              <button
                type="button"
                onClick={startStripeOnboarding}
                disabled={payoutsBusy}
                className="mt-3 text-xs text-stone underline underline-offset-2 hover:text-midnight"
              >
                Update bank or ID details
              </button>
            </div>
          ) : payoutsState.connected && payoutsState.details_submitted ? (
            <div className="rounded-2xl border border-amber2/30 bg-paper/40 p-4">
              <div className="font-medium text-amber2">
                Verification pending
              </div>
              <p className="mt-1 text-sm text-midnight/80">
                Stripe is reviewing your details. This usually takes a day;
                we&apos;ll turn on payouts automatically when they approve.
              </p>
              <button
                type="button"
                onClick={refreshPayoutsState}
                className="mt-3 text-xs text-midnight underline underline-offset-2"
              >
                Refresh status
              </button>
            </div>
          ) : payoutsState.connected ? (
            <div className="rounded-2xl border border-amber2/40 bg-paper/40 p-4">
              <div className="font-medium">Finish payout setup</div>
              <p className="mt-1 text-sm text-midnight/80">
                You started onboarding but didn&apos;t finish. Continue to
                add your Emirates ID and bank account.
              </p>
              <button
                type="button"
                onClick={startStripeOnboarding}
                disabled={payoutsBusy}
                className="mt-3 rounded-full bg-midnight px-4 py-2 text-sm font-medium text-bone disabled:opacity-50"
              >
                {payoutsBusy ? "Opening…" : "Continue setup"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-paper bg-paper/40 p-4">
              <div className="font-medium">Set up payouts</div>
              <p className="mt-1 text-sm text-midnight/80">
                Add your Emirates ID and bank account via Stripe so we can
                pay you automatically after every walk.
              </p>
              <button
                type="button"
                onClick={startStripeOnboarding}
                disabled={payoutsBusy}
                className="mt-3 rounded-full bg-midnight px-4 py-2 text-sm font-medium text-bone disabled:opacity-50"
              >
                {payoutsBusy ? "Opening…" : "Set up payouts"}
              </button>
            </div>
          )}
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

function IdSlot({
  label,
  url,
  uploading,
  onPick,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={uploading}
      className="group relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-chalk bg-paper/40 text-xs text-stone transition hover:border-midnight disabled:opacity-50"
      aria-label={`Upload ${label}`}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-midnight/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
            <span className="text-xs font-medium text-bone">
              Tap to replace {label.toLowerCase()}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 px-4 text-center">
          <span className="text-base">+</span>
          <span>{uploading ? "Uploading…" : `Upload ${label.toLowerCase()}`}</span>
        </div>
      )}
    </button>
  );
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

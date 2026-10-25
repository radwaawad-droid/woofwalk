"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DUBAI_AREAS,
  getMyProfile,
  Profile,
  updateMyProfile,
} from "@/lib/db";
import { Button, Field, Header, inputCls } from "@/components/UI";

export default function OwnerProfileEdit() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState<string>(DUBAI_AREAS[0]);
  const [community, setCommunity] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p || p.role !== "owner") {
        router.replace("/");
        return;
      }
      setProfile(p);
      setName(p.name);
      setPhone(p.phone || "");
      if (p.area) setArea(p.area);
      setCommunity(p.community || "");
    })();
  }, [router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!name.trim()) {
      setErr("Name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        area,
        community: community.trim() || null,
      });
      setMsg("Saved.");
      setTimeout(() => router.replace("/owner"), 500);
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
      <Header title="" back="/owner" />

      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          Your profile.
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          How your walker sees you.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-5 px-5 py-6">
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

        <Field
          label="Community"
          hint="Sub-community or tower, e.g. Saheel 4, Palmera 2, District 10, Marina Pinnacle Tower"
        >
          <input
            className={inputCls}
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            placeholder="e.g. Saheel 4"
          />
        </Field>

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

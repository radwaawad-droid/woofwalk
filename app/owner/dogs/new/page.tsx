"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  addDog,
  uploadDogPhoto,
  updateDog,
} from "@/lib/db";
import { Button, Field, Header, inputCls, PawIcon } from "@/components/UI";

export default function NewDog() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [notes, setNotes] = useState("");
  // Local preview before saving — the actual upload happens AFTER the dog
  // row is created, because the photo path is namespaced by dog id.
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreviewFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr("Give your dog a name.");
      return;
    }
    setSaving(true);
    try {
      const d = await addDog({
        name: name.trim(),
        breed: breed.trim() || "Mixed",
        size,
        notes: notes.trim() || undefined,
      });
      if (previewFile) {
        try {
          const url = await uploadDogPhoto(d.id, previewFile);
          await updateDog(d.id, { photo_url: url });
        } catch {
          // Non-fatal — dog saved, photo failed
        }
      }
      router.replace("/owner");
    } catch (e: any) {
      setErr(e?.message || "Could not add your dog.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen pb-28">
      <Header title="" back="/owner" />

      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          A new dog.
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          A name is all we need; the rest helps walkers care for them properly.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-6 px-5 py-6">
        {/* Photo */}
        <section className="flex items-center gap-5">
          <div className="relative shrink-0">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
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
              onChange={onPickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-midnight px-4 py-2 text-sm font-medium text-midnight transition hover:bg-midnight hover:text-bone"
            >
              {previewUrl ? "Change photo" : "Add photo"}
            </button>
            <p className="mt-2 text-xs text-stone">
              Optional, but it helps walkers recognise them.
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-paper pt-6">
          <Field label="Name">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rex"
              required
            />
          </Field>

          <Field label="Breed">
            <input
              className={inputCls}
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="e.g. Golden Retriever"
            />
          </Field>

          <Field label="Size">
            <div className="grid grid-cols-3 gap-2">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-full border py-2.5 text-sm font-medium capitalize transition ${
                    size === s
                      ? "border-midnight bg-midnight text-bone"
                      : "border-chalk bg-bone text-midnight hover:border-midnight"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Notes for the walker"
            hint="Quirks, meds, how they are on the lead."
          >
            <textarea
              className={inputCls}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pulls on the lead at first but settles after 5 minutes. Nervous of big dogs."
            />
          </Field>
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
          disabled={saving}
        >
          {saving ? "Saving…" : "Add dog"}
        </Button>
      </nav>
    </main>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Dog,
  deleteDog,
  getDog,
  getMyProfile,
  updateDog,
  uploadDogPhoto,
} from "@/lib/db";
import { Button, Field, Header, inputCls, PawIcon } from "@/components/UI";

export default function EditDog() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [dog, setDog] = useState<Dog | null>(null);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notAllowed, setNotAllowed] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const me = await getMyProfile();
      if (!me || me.role !== "owner") {
        router.replace("/");
        return;
      }
      const d = await getDog(params.id);
      if (!d) {
        setNotAllowed("Dog not found.");
        return;
      }
      if (d.owner_id !== me.id) {
        setNotAllowed("This isn't your dog.");
        return;
      }
      setDog(d);
      setName(d.name);
      setBreed(d.breed || "");
      setSize((d.size as any) || "medium");
      setNotes(d.notes || "");
      setPhotoUrl(d.photo_url);
    })();
  }, [params.id, router]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !dog) return;
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadDogPhoto(dog.id, f);
      // Save immediately so a refresh keeps it even without hitting Save below
      await updateDog(dog.id, { photo_url: url });
      setPhotoUrl(url);
    } catch (e: any) {
      setErr(e?.message || "Photo upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dog) return;
    setErr(null);
    if (!name.trim()) {
      setErr("Give your dog a name.");
      return;
    }
    setSaving(true);
    try {
      await updateDog(dog.id, {
        name: name.trim(),
        breed: breed.trim() || "Mixed",
        size,
        notes: notes.trim() || null,
      });
      router.replace("/owner");
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!dog) return;
    setDeleting(true);
    try {
      await deleteDog(dog.id);
      router.replace("/owner");
    } catch (e: any) {
      setErr(e?.message || "Delete failed.");
      setDeleting(false);
    }
  }

  if (notAllowed) {
    return (
      <main className="min-h-screen">
        <Header title="" back="/owner" />
        <div className="px-5 py-16 text-center">
          <h1 className="font-serif text-2xl">{notAllowed}</h1>
        </div>
      </main>
    );
  }
  if (!dog) {
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
          {dog.name}
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          Keep this up to date so your walker always knows what they&apos;re
          working with.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-6 px-5 py-6">
        {/* Photo */}
        <section className="flex items-center gap-5">
          <div className="relative shrink-0">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={dog.name}
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
              disabled={uploading}
              className="rounded-full border border-midnight px-4 py-2 text-sm font-medium text-midnight transition hover:bg-midnight hover:text-bone disabled:opacity-50"
            >
              {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
            </button>
            {photoUrl && !uploading && (
              <button
                type="button"
                onClick={async () => {
                  await updateDog(dog.id, { photo_url: null });
                  setPhotoUrl(null);
                }}
                className="ml-2 text-xs text-stone hover:text-midnight"
              >
                Remove
              </button>
            )}
            <p className="mt-2 text-xs text-stone">
              A clear photo helps walkers recognise them.
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-paper pt-6">
          <Field label="Name">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              placeholder="e.g. Pulls on the lead at first but settles after 5 minutes."
            />
          </Field>
        </section>

        {err && (
          <div className="rounded-xl border border-clay/40 bg-bone p-3 text-sm text-clay">
            {err}
          </div>
        )}

        {/* Delete */}
        <section className="border-t border-paper pt-6">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-medium text-clay hover:underline"
            >
              Remove {dog.name} from WoofWalk
            </button>
          ) : (
            <div className="rounded-2xl border border-clay/40 bg-bone p-4">
              <p className="text-sm text-midnight">
                Remove <strong>{dog.name}</strong>? Past walks are kept but you
                won&apos;t be able to request new ones.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="rounded-full bg-clay px-4 py-2 text-sm font-medium text-bone hover:brightness-110 disabled:opacity-50"
                >
                  {deleting ? "Removing…" : `Yes, remove ${dog.name}`}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-full px-4 py-2 text-sm text-stone hover:text-midnight"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </form>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-paper bg-bone px-5 py-3">
        <Button
          type="button"
          onClick={() =>
            (document.querySelector("form") as HTMLFormElement)?.requestSubmit()
          }
          disabled={saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </nav>
    </main>
  );
}

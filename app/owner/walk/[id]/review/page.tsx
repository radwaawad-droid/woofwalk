"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createReview,
  getMyProfile,
  getReviewForWalk,
  getWalk,
  getWalkerProfile,
  WalkerProfile,
  WalkWithRefs,
} from "@/lib/db";
import { Button, Field, Header, inputCls, PawIcon } from "@/components/UI";

export default function RateWalk() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [walk, setWalk] = useState<WalkWithRefs | null>(null);
  const [walker, setWalker] = useState<WalkerProfile | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notAllowed, setNotAllowed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await getMyProfile();
      if (!me || me.role !== "owner") {
        router.replace("/");
        return;
      }
      const w = await getWalk(params.id);
      if (!w || w.owner_id !== me.id) {
        setNotAllowed("This walk isn't yours.");
        setLoading(false);
        return;
      }
      if (w.status !== "completed") {
        setNotAllowed(
          "You can only rate a walk that's been completed.",
        );
        setLoading(false);
        return;
      }
      if (!w.walker_id) {
        setNotAllowed("This walk has no walker to rate.");
        setLoading(false);
        return;
      }
      // Already reviewed?
      const existing = await getReviewForWalk(w.id);
      if (existing) {
        // Jump back to the walk — the walk page shows "You rated X stars"
        router.replace(`/owner/walk/${w.id}`);
        return;
      }
      setWalk(w);
      try {
        const wp = await getWalkerProfile(w.walker_id);
        setWalker(wp);
      } catch {}
      setLoading(false);
    })();
  }, [params.id, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walk || !walk.walker_id || rating < 1) return;
    setErr(null);
    setSaving(true);
    try {
      await createReview({
        walk_id: walk.id,
        walker_id: walk.walker_id,
        rating,
        comment: comment.trim() || undefined,
      });
      router.replace(`/owner/walk/${walk.id}`);
    } catch (e: any) {
      setErr(e?.message || "Could not save your review.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }
  if (notAllowed) {
    return (
      <main className="min-h-screen">
        <Header title="" back={`/owner/walk/${params.id}`} />
        <div className="px-5 py-16 text-center">
          <h1 className="font-serif text-2xl">Can&apos;t rate this.</h1>
          <p className="mt-2 text-sm text-stone">{notAllowed}</p>
        </div>
      </main>
    );
  }
  if (!walk) return null;

  const activeRating = hoverRating || rating;
  const promptCopy = [
    "", // 0 — nothing selected
    "Terrible — tell us what went wrong.",
    "Not great. We'd like to make it right.",
    "OK, nothing to complain about.",
    "Great — would book again.",
    "Loved it. Highly recommended.",
  ][activeRating] || "Tap a star to rate.";

  return (
    <main className="min-h-screen pb-32">
      <Header title="" back={`/owner/walk/${walk.id}`} />

      <section className="px-5 pt-2">
        <p className="text-sm text-stone">Rate your walk</p>
        <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tightest">
          How was {walk.walker_name} with {walk.dog_name}?
        </h1>
      </section>

      <form onSubmit={onSubmit} className="space-y-8 px-5 py-8">
        {/* Walker summary */}
        <div className="flex items-center gap-4 border-y border-paper py-4">
          {walker?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={walker.photo_url}
              alt={walk.walker_name || "Walker"}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper">
              <PawIcon className="h-6 w-6 text-midnight/60" />
            </div>
          )}
          <div>
            <div className="font-serif text-lg leading-tight">
              {walk.walker_name}
            </div>
            <div className="text-xs text-stone">
              {walk.duration_min} min · {walk.area}
            </div>
          </div>
        </div>

        {/* Star picker */}
        <div>
          <div className="mb-3 text-xs font-medium text-stone">Your rating</div>
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = activeRating >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="group flex h-16 flex-1 items-center justify-center rounded-2xl border border-paper transition active:scale-95"
                  aria-label={`Rate ${n} out of 5`}
                >
                  <StarIcon filled={filled} />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-sm italic text-stone">
            {promptCopy}
          </p>
        </div>

        {/* Comment */}
        <Field label="Anything to share?" hint="Optional, visible on the walker's profile.">
          <textarea
            className={inputCls}
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. On time, sent lovely photos, and tired Rex out properly. Would book again."
          />
        </Field>

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
          disabled={rating < 1 || saving}
        >
          {saving ? "Saving…" : rating < 1 ? "Pick a rating" : "Submit review"}
        </Button>
      </nav>
    </main>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill={filled ? "#D8E86B" : "none"}
      stroke="#0E1C2F"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M12 3l2.76 5.59 6.17.9-4.46 4.35 1.05 6.14L12 17.1l-5.52 2.88 1.05-6.14L3.07 9.49l6.17-.9L12 3Z" />
    </svg>
  );
}

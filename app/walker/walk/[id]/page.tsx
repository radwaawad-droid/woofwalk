"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  acceptWalk,
  bumpPhoto,
  endWalk,
  getMyProfile,
  getWalk,
  startWalk,
  Profile,
  WalkWithRefs,
} from "@/lib/db";
import { Button, Card, Header, PawIcon } from "@/components/UI";

function fmtTime(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WalkerWalkDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [walk, setWalk] = useState<WalkWithRefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p || p.role !== "walker") {
        router.replace("/");
        return;
      }
      setMe(p);
      const w = await getWalk(params.id);
      if (!w) {
        router.replace("/walker");
        return;
      }
      setWalk(w);
    })();
  }, [params.id, router]);

  useEffect(() => {
    const int = setInterval(async () => {
      const w = await getWalk(params.id);
      if (w) setWalk(w);
    }, 2000);
    return () => clearInterval(int);
  }, [params.id]);

  if (!me || !walk) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  const isMine = walk.walker_id === me.id;
  const canAccept = walk.status === "pending";

  async function doAccept() {
    if (!walk) return;
    setBusy(true);
    try {
      await acceptWalk(walk.id);
      const w = await getWalk(walk.id);
      setWalk(w);
    } finally {
      setBusy(false);
    }
  }
  async function doStart() {
    if (!walk) return;
    setBusy(true);
    try {
      await startWalk(walk.id);
      const w = await getWalk(walk.id);
      setWalk(w);
    } finally {
      setBusy(false);
    }
  }
  async function doPhoto() {
    if (!walk) return;
    await bumpPhoto(walk.id);
    const w = await getWalk(walk.id);
    setWalk(w);
  }
  async function doEnd() {
    if (!walk) return;
    setBusy(true);
    try {
      await endWalk(walk.id);
      setTimeout(() => router.replace("/walker"), 400);
    } finally {
      setBusy(false);
    }
  }

  // Headline that reads like a line in the walker's day
  const headline =
    walk.status === "pending"
      ? `Walk ${walk.dog_name}?`
      : walk.status === "accepted"
        ? `On your way to ${walk.dog_name}.`
        : walk.status === "in_progress"
          ? `Walking ${walk.dog_name}.`
          : walk.status === "completed"
            ? `Walk completed.`
            : `Walk cancelled.`;

  return (
    <main className="min-h-screen pb-32">
      <Header title="" back="/walker" />

      {/* Headline */}
      <section className="px-5 pt-2">
        <p className="text-sm text-stone">{walk.area}</p>
        <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tightest">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          {walk.dog_breed || "Mixed"} · {walk.duration_min} minute walk · AED{" "}
          {walk.price_aed}
        </p>
      </section>

      <section className="space-y-4 px-5 py-6">
        {/* Dog card — the headline subject */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-midnight/60">
              <PawIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-serif text-lg leading-tight">
                {walk.dog_name}
              </div>
              <div className="text-xs text-stone">
                {walk.dog_breed || "Mixed"} · owner {walk.owner_name}
              </div>
            </div>
          </div>
        </Card>

        {/* Walk facts */}
        <section>
          <h2 className="mb-2 font-serif text-base">Pickup</h2>
          <div className="rounded-2xl border border-paper p-4 text-sm">
            <div className="whitespace-pre-wrap text-midnight">
              {walk.address}
            </div>
          </div>
        </section>

        {/* In-progress panel */}
        {walk.status === "in_progress" && isMine && (
          <Card tone="dark">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-lime">
                Walking
              </div>
              <span className="flex items-center gap-1.5 text-xs text-lime">
                <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
                Tracking
              </span>
            </div>
            <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-bone/15 bg-night text-sm text-bone/60">
              GPS tracking arrives in a later update
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-bone/80">
              <span>Photos sent</span>
              <strong className="font-serif text-lg text-bone">
                {walk.photo_count || 0}
              </strong>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={doPhoto}
                className="w-full rounded-full border border-bone/40 bg-transparent px-5 py-3 text-sm font-medium text-bone transition hover:bg-bone hover:text-midnight"
              >
                Send a photo to the owner
              </button>
            </div>
          </Card>
        )}

        {/* Timeline — subtle */}
        <p className="pt-1 text-xs text-stone">
          Requested {fmtTime(walk.created_at)}
          {walk.accepted_at && <> · Accepted {fmtTime(walk.accepted_at)}</>}
          {walk.started_at && <> · Started {fmtTime(walk.started_at)}</>}
          {walk.ended_at && <> · Ended {fmtTime(walk.ended_at)}</>}
        </p>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-paper bg-bone px-5 py-3 space-y-2">
        {canAccept && (
          <Button onClick={doAccept} disabled={busy}>
            {busy ? "Accepting…" : `Accept walk · AED ${walk.price_aed}`}
          </Button>
        )}
        {walk.status === "accepted" && isMine && (
          <Button onClick={doStart} disabled={busy}>
            {busy ? "Starting…" : "Start walk"}
          </Button>
        )}
        {walk.status === "in_progress" && isMine && (
          <Button variant="danger" onClick={doEnd} disabled={busy}>
            {busy ? "Ending…" : "End walk"}
          </Button>
        )}
        {walk.status === "completed" && (
          <div className="py-2 text-center text-sm text-emerald2">
            Walk completed · AED {walk.price_aed} payout queued
          </div>
        )}
        {!canAccept && !isMine && walk.status !== "completed" && (
          <div className="py-2 text-center text-sm text-stone">
            This walk was taken by another walker.
          </div>
        )}
      </nav>
    </main>
  );
}

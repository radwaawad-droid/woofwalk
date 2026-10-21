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
import { Badge, Button, Card, Header } from "@/components/UI";

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
    return <div className="p-8 text-center text-stone">Loading…</div>;
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

  return (
    <main className="min-h-screen pb-28">
      <Header title="Walk" back="/walker" />

      <section className="space-y-4 px-5 py-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-stone">
                Dog
              </div>
              <div className="mt-1 text-xl font-bold">{walk.dog_name}</div>
              <div className="text-sm text-stone">{walk.dog_breed || "Mixed"}</div>
            </div>
            <Badge
              tone={
                walk.status === "completed"
                  ? "ok"
                  : walk.status === "pending"
                    ? "warn"
                    : "info"
              }
            >
              {walk.status === "in_progress" ? "walking" : walk.status}
            </Badge>
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-stone">Owner</div>
              <div className="font-semibold">{walk.owner_name}</div>
            </div>
            <div>
              <div className="text-xs text-stone">Earnings</div>
              <div className="font-semibold">AED {walk.price_aed}</div>
            </div>
            <div>
              <div className="text-xs text-stone">Area</div>
              <div className="font-semibold">{walk.area}</div>
            </div>
            <div>
              <div className="text-xs text-stone">Duration</div>
              <div className="font-semibold">{walk.duration_min} min</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-stone">Pickup address</div>
              <div className="font-medium">{walk.address}</div>
            </div>
          </div>
        </Card>

        {walk.status === "in_progress" && isMine && (
          <Card className="border-midnight">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-midnight">
                Walk in progress
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Tracking
              </span>
            </div>
            <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-paper text-midnight">
              🗺️ GPS tracking (real in v1)
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>Photos sent</span>
              <strong>{walk.photo_count || 0}</strong>
            </div>
            <div className="mt-2">
              <Button variant="secondary" onClick={doPhoto}>
                📷 Send photo to owner
              </Button>
            </div>
          </Card>
        )}

        <div className="text-xs text-stone">
          Requested {fmtTime(walk.created_at)}
          {walk.accepted_at && <> · Accepted {fmtTime(walk.accepted_at)}</>}
          {walk.started_at && <> · Started {fmtTime(walk.started_at)}</>}
          {walk.ended_at && <> · Ended {fmtTime(walk.ended_at)}</>}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-paper bg-white px-5 py-3 space-y-2">
        {canAccept && (
          <Button onClick={doAccept} disabled={busy}>
            Accept walk · AED {walk.price_aed}
          </Button>
        )}
        {walk.status === "accepted" && isMine && (
          <Button onClick={doStart} disabled={busy}>
            Start walk
          </Button>
        )}
        {walk.status === "in_progress" && isMine && (
          <Button variant="danger" onClick={doEnd} disabled={busy}>
            End walk
          </Button>
        )}
        {walk.status === "completed" && (
          <div className="text-center text-sm text-emerald-700">
            Walk completed · AED {walk.price_aed} will be paid out
          </div>
        )}
        {!canAccept && !isMine && walk.status !== "completed" && (
          <div className="text-center text-sm text-stone">
            This walk was taken by another walker.
          </div>
        )}
      </nav>
    </main>
  );
}

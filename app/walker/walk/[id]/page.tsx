"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  acceptWalk,
  addPhoto,
  endWalk,
  getUser,
  getWalk,
  startWalk,
  User,
  WalkRequest,
} from "@/lib/store";
import { Badge, Button, Card, Header } from "@/components/UI";

function fmtTime(ms?: number) {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WalkerWalkDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [walk, setWalk] = useState<WalkRequest | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "walker") {
      router.replace("/");
      return;
    }
    setUser(u);
    const refresh = () => {
      const w = getWalk(params.id);
      if (!w) {
        router.replace("/walker");
        return;
      }
      setWalk({ ...w });
    };
    refresh();
    const int = setInterval(refresh, 1500);
    return () => clearInterval(int);
  }, [params.id, router]);

  if (!user || !walk) return null;

  const isMine = walk.walkerId === user.id;
  const canAccept = walk.status === "pending";

  function doAccept() {
    if (!user || !walk) return;
    acceptWalk(walk.id, user);
  }

  function doStart() {
    if (!walk) return;
    startWalk(walk.id);
  }

  function doPhoto() {
    if (!walk) return;
    addPhoto(walk.id);
  }

  function doEnd() {
    if (!walk) return;
    endWalk(walk.id);
    setTimeout(() => router.replace("/walker"), 500);
  }

  return (
    <main className="min-h-screen pb-28">
      <Header title="Walk" back="/walker" />

      <section className="space-y-4 px-5 py-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-500">
                Dog
              </div>
              <div className="mt-1 text-xl font-bold">
                {walk.dogName}
              </div>
              <div className="text-sm text-ink-500">{walk.dogBreed}</div>
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
              <div className="text-xs text-ink-500">Owner</div>
              <div className="font-semibold">{walk.ownerName}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">Earnings</div>
              <div className="font-semibold">AED {walk.priceAed}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">Area</div>
              <div className="font-semibold">{walk.area}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">Duration</div>
              <div className="font-semibold">{walk.durationMin} min</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-ink-500">Pickup address</div>
              <div className="font-medium">{walk.address}</div>
            </div>
          </div>
        </Card>

        {walk.status === "in_progress" && isMine && (
          <Card className="border-brand-300">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-brand-700">
                Walk in progress
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Tracking
              </span>
            </div>
            <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              🗺️ GPS tracking (real in v1)
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>Photos sent</span>
              <strong>{walk.photoCount || 0}</strong>
            </div>
            <div className="mt-2">
              <Button variant="secondary" onClick={doPhoto}>
                📷 Send photo to owner
              </Button>
            </div>
          </Card>
        )}

        <div className="text-xs text-ink-500">
          Requested {fmtTime(walk.createdAt)}
          {walk.acceptedAt && <> · Accepted {fmtTime(walk.acceptedAt)}</>}
          {walk.startedAt && <> · Started {fmtTime(walk.startedAt)}</>}
          {walk.endedAt && <> · Ended {fmtTime(walk.endedAt)}</>}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-ink-100 bg-white px-5 py-3 space-y-2">
        {canAccept && <Button onClick={doAccept}>Accept walk · AED {walk.priceAed}</Button>}
        {walk.status === "accepted" && isMine && (
          <Button onClick={doStart}>Start walk</Button>
        )}
        {walk.status === "in_progress" && isMine && (
          <Button variant="danger" onClick={doEnd}>
            End walk
          </Button>
        )}
        {walk.status === "completed" && (
          <div className="text-center text-sm text-emerald-700">
            Walk completed · AED {walk.priceAed} will be paid out
          </div>
        )}
        {!canAccept && !isMine && (
          <div className="text-center text-sm text-ink-500">
            This walk was taken by another walker.
          </div>
        )}
      </nav>
    </main>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, getWalk, updateWalk, WalkRequest } from "@/lib/store";
import { Badge, Button, Card, Header } from "@/components/UI";

function fmtTime(ms?: number) {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OwnerWalkDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [walk, setWalk] = useState<WalkRequest | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "owner") {
      router.replace("/");
      return;
    }
    const w = getWalk(params.id);
    if (!w || w.ownerId !== u.id) {
      router.replace("/owner");
      return;
    }
    setWalk(w);
    const int = setInterval(() => {
      const latest = getWalk(params.id);
      if (latest) setWalk({ ...latest });
    }, 1500);
    return () => clearInterval(int);
  }, [params.id, router]);

  if (!walk) return null;

  const canCancel = walk.status === "pending";

  function cancel() {
    if (!walk) return;
    updateWalk(walk.id, { status: "cancelled" });
    router.replace("/owner");
  }

  return (
    <main className="min-h-screen">
      <Header title="Walk details" back="/owner" />

      <section className="space-y-4 px-5 py-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-500">
                Status
              </div>
              <div className="mt-1 text-lg font-semibold capitalize">
                {walk.status === "in_progress" ? "Walking now" : walk.status}
              </div>
            </div>
            <Badge
              tone={
                walk.status === "completed"
                  ? "ok"
                  : walk.status === "pending"
                    ? "warn"
                    : walk.status === "cancelled"
                      ? "neutral"
                      : "info"
              }
            >
              {walk.status === "in_progress" ? "live" : walk.status}
            </Badge>
          </div>
        </Card>

        {walk.status === "pending" && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Looking for a walker near {walk.area}… you&apos;ll be notified when
            someone accepts.
          </div>
        )}

        {walk.status === "accepted" && (
          <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
            {walk.walkerName} is on the way to pick up {walk.dogName}.
          </div>
        )}

        {walk.status === "in_progress" && (
          <Card className="border-brand-300">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-brand-700">
                Live walk
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              🗺️ Map preview (real GPS wires up in v1)
            </div>
            <div className="mt-3 text-sm text-ink-700">
              <strong>{walk.photoCount || 0}</strong> photos received
            </div>
          </Card>
        )}

        {walk.status === "completed" && (
          <Card>
            <div className="text-sm font-semibold">All done — thanks!</div>
            <div className="mt-2 text-sm text-ink-500">
              {walk.walkerName} finished walking {walk.dogName} at{" "}
              {fmtTime(walk.endedAt)}. In the real app, your card is charged
              AED {walk.priceAed} now.
            </div>
          </Card>
        )}

        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-ink-500">Dog</div>
              <div className="font-semibold">{walk.dogName}</div>
              <div className="text-ink-500">{walk.dogBreed}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">Walker</div>
              <div className="font-semibold">
                {walk.walkerName || "Not yet"}
              </div>
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
              <div className="text-xs text-ink-500">Address</div>
              <div className="font-medium">{walk.address}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">Price</div>
              <div className="font-semibold">AED {walk.priceAed}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">Requested</div>
              <div className="font-semibold">{fmtTime(walk.createdAt)}</div>
            </div>
          </div>
        </Card>

        {canCancel && (
          <Button variant="ghost" onClick={cancel}>
            Cancel request
          </Button>
        )}
      </section>
    </main>
  );
}

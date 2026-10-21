"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cancelWalk,
  getMyProfile,
  getWalk,
  getWalkerProfile,
  WalkerProfile,
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

export default function OwnerWalkDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [walk, setWalk] = useState<WalkWithRefs | null>(null);
  const [walkerProfile, setWalkerProfile] = useState<WalkerProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await getMyProfile();
      if (!me || me.role !== "owner") {
        router.replace("/");
        return;
      }
      const w = await getWalk(params.id);
      if (!w || w.owner_id !== me.id) {
        setNotFound(true);
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

  useEffect(() => {
    if (walk?.walker_id && !walkerProfile) {
      getWalkerProfile(walk.walker_id).then(setWalkerProfile).catch(() => {});
    }
  }, [walk?.walker_id, walkerProfile]);

  if (notFound) {
    return (
      <main className="min-h-screen">
        <Header title="Walk" back="/owner" />
        <div className="p-8 text-center text-stone">
          This walk doesn&apos;t exist or isn&apos;t yours.
        </div>
      </main>
    );
  }
  if (!walk) return <div className="p-8 text-center text-stone">Loading…</div>;

  const canCancel = walk.status === "pending";

  async function doCancel() {
    if (!walk) return;
    await cancelWalk(walk.id);
    router.replace("/owner");
  }

  return (
    <main className="min-h-screen">
      <Header title="Walk details" back="/owner" />

      <section className="space-y-4 px-5 py-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-stone">Status</div>
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

        {walk.walker_id && (
          <Link href={`/walker-profile/${walk.walker_id}`}>
            <Card>
              <div className="flex items-center gap-3">
                {walkerProfile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={walkerProfile.photo_url}
                    alt={walk.walker_name || "Walker"}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-2xl">
                    🚶
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold">{walk.walker_name}</div>
                  <div className="mt-0.5 text-xs text-stone">
                    {walkerProfile?.rating_avg
                      ? `★ ${walkerProfile.rating_avg} · ${walkerProfile.rating_count} reviews`
                      : "No reviews yet"}
                    {walkerProfile?.id_verified && <> · ✓ Verified</>}
                  </div>
                </div>
                <div className="text-chalk">→</div>
              </div>
            </Card>
          </Link>
        )}

        {walk.status === "in_progress" && (
          <Card className="border-midnight">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-midnight">Live walk</div>
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-paper text-midnight">
              🗺️ Map preview (real GPS wires up in v1)
            </div>
            <div className="mt-3 text-sm text-midnight">
              <strong>{walk.photo_count || 0}</strong> photos received
            </div>
          </Card>
        )}

        {walk.status === "completed" && (
          <Card>
            <div className="text-sm font-semibold">All done — thanks!</div>
            <div className="mt-2 text-sm text-stone">
              {walk.walker_name} finished walking {walk.dog_name} at{" "}
              {fmtTime(walk.ended_at)}. In the real app, your card is charged
              AED {walk.price_aed} now.
            </div>
          </Card>
        )}

        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-stone">Dog</div>
              <div className="font-semibold">{walk.dog_name}</div>
              <div className="text-stone">{walk.dog_breed}</div>
            </div>
            <div>
              <div className="text-xs text-stone">Area</div>
              <div className="font-semibold">{walk.area}</div>
            </div>
            <div>
              <div className="text-xs text-stone">Duration</div>
              <div className="font-semibold">{walk.duration_min} min</div>
            </div>
            <div>
              <div className="text-xs text-stone">Price</div>
              <div className="font-semibold">AED {walk.price_aed}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-stone">Address</div>
              <div className="font-medium">{walk.address}</div>
            </div>
            <div>
              <div className="text-xs text-stone">Requested</div>
              <div className="font-semibold">{fmtTime(walk.created_at)}</div>
            </div>
          </div>
        </Card>

        {canCancel && (
          <Button variant="ghost" onClick={doCancel}>
            Cancel request
          </Button>
        )}
      </section>
    </main>
  );
}

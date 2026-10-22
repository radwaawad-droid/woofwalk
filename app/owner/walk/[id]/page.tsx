"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cancelWalk,
  getMyProfile,
  getReviewForWalk,
  getWalk,
  getWalkerProfile,
  Review,
  WalkerProfile,
  WalkWithRefs,
} from "@/lib/db";
import { Badge, Button, Card, Header, PawIcon } from "@/components/UI";

const WalkMap = dynamic(() => import("@/components/WalkMap").then((m) => m.WalkMap), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-xl border border-bone/15 bg-night/60" />
  ),
});

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
  const [review, setReview] = useState<Review | null>(null);
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

  // Load any existing review when a walk is completed
  useEffect(() => {
    if (walk?.status === "completed" && !review) {
      getReviewForWalk(walk.id).then(setReview).catch(() => {});
    }
  }, [walk?.id, walk?.status, review]);

  if (notFound) {
    return (
      <main className="min-h-screen">
        <Header title="" back="/owner" />
        <div className="px-5 py-16 text-center">
          <h1 className="font-serif text-2xl">Not found.</h1>
          <p className="mt-2 text-sm text-stone">
            This walk doesn&apos;t exist or isn&apos;t yours.
          </p>
        </div>
      </main>
    );
  }
  if (!walk) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  const canCancel = walk.status === "pending";

  async function doCancel() {
    if (!walk) return;
    await cancelWalk(walk.id);
    router.replace("/owner");
  }

  // Human-friendly status line
  const statusLine =
    walk.status === "pending"
      ? "Looking for a walker"
      : walk.status === "accepted"
        ? `${walk.walker_name || "Walker"} is on the way`
        : walk.status === "in_progress"
          ? `${walk.walker_name || "Walker"} is walking ${walk.dog_name}`
          : walk.status === "completed"
            ? "Walk completed"
            : "Walk cancelled";

  return (
    <main className="min-h-screen pb-10">
      <Header title="" back="/owner" />

      {/* Status headline — sets the whole mood of the page */}
      <section className="px-5 pt-2">
        <p className="text-sm text-stone capitalize">
          {walk.status === "in_progress" ? "Live" : walk.status}
        </p>
        <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tightest">
          {statusLine}.
        </h1>
      </section>

      <section className="space-y-4 px-5 py-6">
        {/* Pending state: a soft paper note */}
        {walk.status === "pending" && (
          <Card tone="warn">
            <p className="text-sm text-midnight/80">
              Looking for a walker near{" "}
              <span className="font-medium">{walk.area}</span>. We&apos;ll let
              you know the moment someone accepts.
            </p>
          </Card>
        )}

        {/* Walker card — shows up as soon as there is one */}
        {walk.walker_id && (
          <Link href={`/walker-profile/${walk.walker_id}`}>
            <Card>
              <div className="flex items-center gap-4">
                {walkerProfile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={walkerProfile.photo_url}
                    alt={walk.walker_name || "Walker"}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper">
                    <PawIcon className="h-6 w-6 text-midnight/60" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-serif text-lg leading-tight">
                    {walk.walker_name}
                  </div>
                  <div className="mt-0.5 text-xs text-stone">
                    {walkerProfile?.rating_avg
                      ? `★ ${walkerProfile.rating_avg} · ${walkerProfile.rating_count} review${walkerProfile.rating_count === 1 ? "" : "s"}`
                      : "No reviews yet"}
                    {walkerProfile?.id_verified && (
                      <span className="text-emerald2"> · ✓ Verified</span>
                    )}
                  </div>
                </div>
                <div className="text-stone text-sm">View</div>
              </div>
            </Card>
          </Link>
        )}

        {/* In-progress strip — live indicator + map */}
        {walk.status === "in_progress" && (
          <Card tone="dark">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-lime">
                Walking now
              </div>
              <span className="flex items-center gap-1.5 text-xs text-lime">
                <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
                Live
              </span>
            </div>
            <div className="mt-4">
              <WalkMap walkId={walk.id} heightClass="h-56" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-bone/80">
              <span>Photos received</span>
              <strong className="font-serif text-lg text-bone">
                {walk.photo_count || 0}
              </strong>
            </div>
          </Card>
        )}

        {/* Completed state — either prompt to rate, or show the submitted rating */}
        {walk.status === "completed" && !review && (
          <Card tone="accent">
            <div className="font-serif text-lg">All done.</div>
            <p className="mt-1 text-sm text-midnight/80">
              {walk.walker_name} finished walking {walk.dog_name} at{" "}
              {fmtTime(walk.ended_at)}. Tap below to leave a quick rating.
            </p>
            <div className="mt-4">
              <Link
                href={`/owner/walk/${walk.id}/review`}
                className="inline-flex items-center justify-center rounded-full bg-midnight px-5 py-3 text-sm font-medium text-bone transition hover:bg-night"
              >
                Rate your walk
              </Link>
            </div>
          </Card>
        )}

        {walk.status === "completed" && review && (
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-stone">
                  Your rating
                </div>
                <div className="mt-1.5 text-lg">
                  <span className="text-midnight">
                    {"★".repeat(review.rating)}
                  </span>
                  <span className="text-chalk">
                    {"★".repeat(5 - review.rating)}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm italic text-midnight/80">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}
              </div>
              <div className="text-xs text-stone">
                {new Date(review.created_at).toLocaleDateString()}
              </div>
            </div>
          </Card>
        )}

        {/* Walk facts — plain list, hairlines */}
        <section className="pt-2">
          <h2 className="mb-2 font-serif text-base">Details</h2>
          <dl className="divide-y divide-paper rounded-2xl border border-paper">
            <Row label="Dog" value={`${walk.dog_name}${walk.dog_breed ? ` · ${walk.dog_breed}` : ""}`} />
            <Row label="Area" value={walk.area} />
            <Row label="Duration" value={`${walk.duration_min} min`} />
            <Row label="Price" value={`AED ${walk.price_aed}`} />
            <Row label="Address" value={walk.address} multiline />
            <Row label="Requested" value={fmtTime(walk.created_at)} />
            {walk.accepted_at && (
              <Row label="Accepted" value={fmtTime(walk.accepted_at)} />
            )}
            {walk.started_at && (
              <Row label="Started" value={fmtTime(walk.started_at)} />
            )}
            {walk.ended_at && (
              <Row label="Ended" value={fmtTime(walk.ended_at)} />
            )}
          </dl>
        </section>

        {canCancel && (
          <div className="pt-2">
            <Button variant="ghost" onClick={doCancel}>
              Cancel request
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-xs text-stone pt-0.5">{label}</dt>
      <dd
        className={`text-right text-sm font-medium text-midnight ${multiline ? "max-w-[70%]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

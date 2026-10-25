"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getActiveWalkForMe,
  getMyProfile,
  getMyWalkerCompleted,
  getMyWalkerProfile,
  getOpenWalks,
  Profile,
  signOut,
  WalkerProfile,
  WalkWithRefs,
} from "@/lib/db";
import { Badge, Card, Empty, Header, PawIcon, Wordmark } from "@/components/UI";
import { PushBootstrap } from "@/components/PushBootstrap";

function timeAgo(ts: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtSchedule(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const t = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `today ${t}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  )
    return `tomorrow ${t}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ${t}`;
}

export default function WalkerHome() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walkerProfile, setWalkerProfile] = useState<WalkerProfile | null>(null);
  const [open, setOpen] = useState<WalkWithRefs[]>([]);
  const [active, setActive] = useState<WalkWithRefs | null>(null);
  const [completed, setCompleted] = useState<WalkWithRefs[]>([]);
  const [filterArea, setFilterArea] = useState(true);
  const [loading, setLoading] = useState(true);

  async function refresh(me: Profile | null, useFilter: boolean) {
    if (!me) return;
    try {
      const [o, a, c] = await Promise.all([
        getOpenWalks(useFilter && me.area ? me.area : undefined),
        getActiveWalkForMe(),
        getMyWalkerCompleted(),
      ]);
      setOpen(o);
      setActive(a);
      setCompleted(c);
    } catch {}
  }

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p) {
        router.replace("/");
        return;
      }
      if (p.role !== "walker") {
        router.replace("/owner");
        return;
      }
      setProfile(p);
      try {
        const wp = await getMyWalkerProfile();
        setWalkerProfile(wp);
      } catch {}
      await refresh(p, filterArea);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    const int = setInterval(() => refresh(profile, filterArea), 3000);
    return () => clearInterval(int);
  }, [profile, filterArea]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  // 10% platform fee, min AED 1 — matches platformFeeFromPrice() on the server
  const grossEarnings = completed.reduce((sum, w) => sum + w.price_aed, 0);
  const earnings = completed.reduce((sum, w) => {
    const fee = Math.max(1, Math.round(w.price_aed * 0.1));
    return sum + (w.price_aed - fee);
  }, 0);
  const profileComplete = !!(walkerProfile?.photo_url && walkerProfile?.bio);

  return (
    <main className="min-h-screen pb-10">
      <Header
        title=""
        right={
          <div className="flex items-center gap-3">
            <Wordmark className="opacity-80" />
            <button
              onClick={async () => {
                await signOut();
                router.replace("/");
              }}
              className="text-xs text-stone hover:text-midnight"
            >
              Sign out
            </button>
          </div>
        }
      />

      <section className="px-5 pt-4">
        <p className="text-sm text-stone">Welcome,</p>
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          {profile.name.split(" ")[0]}.
        </h1>
      </section>

      <section className="space-y-4 px-5 py-6">
        <PushBootstrap />
        {!profileComplete && (
          <Link href="/walker/profile/edit">
            <Card tone="warn">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-amber2">
                    Finish your profile
                  </div>
                  <div className="mt-1.5 text-sm text-midnight">
                    Owners book walkers they can see. Add a photo and a short
                    bio.
                  </div>
                </div>
                <PawIcon className="h-5 w-5 text-midnight/60" />
              </div>
            </Card>
          </Link>
        )}

        <Card tone="dark">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-lime">
                Earnings
              </div>
              <div className="mt-2 font-serif text-4xl tracking-tightest">
                AED {earnings}
              </div>
              <div className="mt-1 text-sm text-bone/70">
                {completed.length} walk{completed.length === 1 ? "" : "s"} completed
                {grossEarnings > earnings && (
                  <>
                    {" "}
                    · AED {grossEarnings - earnings} fee
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/walker/profile/edit"
            className="rounded-full border border-midnight bg-bone py-3 text-center text-sm font-medium text-midnight transition hover:bg-midnight hover:text-bone"
          >
            Edit profile
          </Link>
          <Link
            href={`/walker-profile/${profile.id}`}
            className="rounded-full border border-paper bg-bone py-3 text-center text-sm font-medium text-midnight transition hover:border-midnight"
          >
            Preview
          </Link>
        </div>

        {active && (
          <Link href={`/walker/walk/${active.id}`}>
            <Card tone="accent">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-midnight/70">
                    {active.status === "in_progress"
                      ? "Walking now"
                      : "You accepted a walk"}
                  </div>
                  <div className="mt-1.5 font-serif text-lg text-midnight">
                    {active.dog_name || "The dog"} · {active.area}
                  </div>
                  <div className="mt-0.5 text-sm text-midnight/70">
                    {active.duration_min} min · AED {active.price_aed}
                  </div>
                </div>
                <PawIcon className="h-6 w-6 text-midnight" />
              </div>
            </Card>
          </Link>
        )}

        <div className="flex items-baseline justify-between pt-2">
          <h2 className="font-serif text-lg">Open requests</h2>
          <label className="flex items-center gap-2 text-xs text-stone">
            <input
              type="checkbox"
              checked={filterArea}
              onChange={(e) => setFilterArea(e.target.checked)}
              className="accent-midnight"
            />
            {profile.area} only
          </label>
        </div>

        {open.length === 0 ? (
          <Empty
            title="Quiet right now"
            body="New walk requests in your area will show up here. Keep this page open."
          />
        ) : (
          <ul className="divide-y divide-paper rounded-2xl border border-paper">
            {open.map((w) => {
              const isScheduled = !!w.scheduled_for;
              return (
                <li key={w.id}>
                  <Link
                    href={`/walker/walk/${w.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-4 transition hover:bg-paper/40"
                  >
                    <div>
                      <div className="font-medium">
                        {w.dog_name || "A dog"}{" "}
                        <span className="font-normal text-stone">
                          · {w.dog_breed || "Mixed breed"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-stone">
                        {w.area}
                        {w.community && ` · ${w.community}`} · {w.duration_min} min
                      </div>
                      <div className="mt-1 text-xs text-stone/80">
                        {isScheduled
                          ? `Scheduled · ${fmtSchedule(w.scheduled_for!)}`
                          : timeAgo(w.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-lg tracking-tightest">
                        AED {w.price_aed}
                      </div>
                      <Badge tone={isScheduled ? "info" : "accent"}>
                        {isScheduled ? "Scheduled" : "Now"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {completed.length > 0 && (
          <div className="pt-4">
            <h2 className="mb-3 font-serif text-lg">Completed</h2>
            <ul className="divide-y divide-paper rounded-2xl border border-paper">
              {completed.slice(0, 5).map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{w.dog_name || "A dog"}</div>
                    <div className="text-xs text-stone">
                      {w.area} · {w.duration_min} min
                    </div>
                  </div>
                  <div className="font-serif tracking-tightest">
                    AED {w.price_aed}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

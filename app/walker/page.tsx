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
import { Badge, Button, Card, Empty, Header } from "@/components/UI";

function timeAgo(ts: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
    } catch (e) {
      /* ignore */
    }
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
    return <div className="p-8 text-center text-ink-500">Loading…</div>;
  }

  const earnings = completed.reduce((sum, w) => sum + w.price_aed, 0);
  const profileComplete = !!(walkerProfile?.photo_url && walkerProfile?.bio);

  return (
    <main className="min-h-screen pb-6">
      <Header
        title={`Hi, ${profile.name.split(" ")[0]}`}
        right={
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="text-xs font-medium text-ink-500"
          >
            Sign out
          </button>
        }
      />

      <section className="space-y-4 px-5 py-5">
        {!profileComplete && (
          <Link href="/walker/profile/edit">
            <Card className="border-amber-300 bg-amber-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Finish your profile
                  </div>
                  <div className="mt-1 text-sm text-amber-900">
                    Owners book walkers they can see. Add a photo and a short
                    bio.
                  </div>
                </div>
                <div className="text-xl">→</div>
              </div>
            </Card>
          </Link>
        )}

        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <div className="text-xs uppercase tracking-wide text-brand-100">
            Earnings
          </div>
          <div className="mt-1 text-3xl font-bold">AED {earnings}</div>
          <div className="mt-1 text-sm text-brand-100">
            {completed.length} walk{completed.length === 1 ? "" : "s"} completed
          </div>
        </Card>

        <div className="flex gap-2">
          <Link
            href="/walker/profile/edit"
            className="flex-1 rounded-xl border border-ink-100 bg-white p-3 text-center text-sm font-semibold"
          >
            Edit profile
          </Link>
          <Link
            href={`/walker-profile/${profile.id}`}
            className="flex-1 rounded-xl border border-ink-100 bg-white p-3 text-center text-sm font-semibold"
          >
            Preview profile
          </Link>
        </div>

        {active && (
          <Link href={`/walker/walk/${active.id}`}>
            <Card className="border-brand-300 bg-brand-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {active.status === "in_progress"
                      ? "Walk in progress"
                      : "You accepted a walk"}
                  </div>
                  <div className="mt-1 font-semibold">
                    {active.dog_name} · {active.area}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-500">
                    {active.duration_min} min · AED {active.price_aed}
                  </div>
                </div>
                <div className="text-xl">→</div>
              </div>
            </Card>
          </Link>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Open requests</h2>
          <label className="flex items-center gap-2 text-xs text-ink-500">
            <input
              type="checkbox"
              checked={filterArea}
              onChange={(e) => setFilterArea(e.target.checked)}
            />
            My area only ({profile.area})
          </label>
        </div>

        {open.length === 0 ? (
          <Empty
            title="No requests right now"
            body="New walk requests in your area will show up here. Keep this page open."
          />
        ) : (
          <div className="space-y-2">
            {open.map((w) => (
              <Link key={w.id} href={`/walker/walk/${w.id}`}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {w.dog_name}{" "}
                        <span className="text-sm font-normal text-ink-500">
                          · {w.dog_breed || "Mixed"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm text-ink-500">
                        {w.area} · {w.duration_min} min
                      </div>
                      <div className="mt-1 text-xs text-ink-500">
                        {timeAgo(w.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">AED {w.price_aed}</div>
                      <Badge tone="warn">New</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className="pt-2">
            <h2 className="mb-2 font-semibold">Completed</h2>
            <div className="space-y-2">
              {completed.slice(0, 5).map((w) => (
                <Card key={w.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{w.dog_name}</div>
                      <div className="text-xs text-ink-500">
                        {w.area} · {w.duration_min} min
                      </div>
                    </div>
                    <div className="font-semibold">AED {w.price_aed}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

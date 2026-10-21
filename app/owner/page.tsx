"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dog,
  getMyDogs,
  getMyOwnerWalks,
  getMyProfile,
  Profile,
  signOut,
  WalkWithRefs,
} from "@/lib/db";
import { Badge, Button, Card, Empty, Header } from "@/components/UI";

function statusTone(s: WalkWithRefs["status"]) {
  if (s === "pending") return "warn" as const;
  if (s === "accepted") return "info" as const;
  if (s === "in_progress") return "info" as const;
  if (s === "completed") return "ok" as const;
  return "neutral" as const;
}

function statusLabel(s: WalkWithRefs["status"]) {
  if (s === "in_progress") return "Walking now";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeAgo(ts: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OwnerHome() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [walks, setWalks] = useState<WalkWithRefs[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const [d, w] = await Promise.all([getMyDogs(), getMyOwnerWalks()]);
      setDogs(d);
      setWalks(w);
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
      if (p.role !== "owner") {
        router.replace("/walker");
        return;
      }
      setProfile(p);
      await refresh();
      setLoading(false);
    })();
    const int = setInterval(refresh, 3000);
    return () => clearInterval(int);
  }, [router]);

  if (loading || !profile) {
    return <div className="p-8 text-center text-ink-500">Loading…</div>;
  }

  const active = walks.find(
    (w) => w.status === "accepted" || w.status === "in_progress",
  );

  return (
    <main className="min-h-screen pb-24">
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
        {active && (
          <Link href={`/owner/walk/${active.id}`}>
            <Card className="border-brand-300 bg-brand-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Walk in progress
                  </div>
                  <div className="mt-1 font-semibold">
                    {active.walker_name || "Walker"} is walking {active.dog_name}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-500">
                    {active.area} · {active.duration_min} min
                  </div>
                </div>
                <div className="text-xl">→</div>
              </div>
            </Card>
          </Link>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your dogs</h2>
          <Link href="/owner/request" className="text-sm font-semibold text-brand-600">
            + Request walk
          </Link>
        </div>

        {dogs.length === 0 ? (
          <Empty
            title="No dogs yet"
            body="Add your dog to request a walk."
            action={
              <Link
                href="/owner/request"
                className="inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Add dog & request
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {dogs.map((d) => (
              <Card key={d.id}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
                    🐕
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-sm text-ink-500">
                      {d.breed || "Mixed"} · {d.size || "medium"}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="pt-2">
          <h2 className="mb-2 font-semibold">Recent walks</h2>
          {walks.length === 0 ? (
            <div className="text-sm text-ink-500">
              Your walk history will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {walks.map((w) => (
                <Link key={w.id} href={`/owner/walk/${w.id}`}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{w.dog_name}</div>
                        <div className="mt-0.5 text-sm text-ink-500">
                          {w.area} · {w.duration_min} min · AED {w.price_aed}
                        </div>
                        <div className="mt-1 text-xs text-ink-500">
                          {timeAgo(w.created_at)}
                        </div>
                      </div>
                      <Badge tone={statusTone(w.status)}>{statusLabel(w.status)}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-ink-100 bg-white px-5 py-3">
        <Button onClick={() => router.push("/owner/request")}>Request a walk</Button>
      </nav>
    </main>
  );
}

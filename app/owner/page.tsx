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
import { Badge, Button, Card, Empty, Header, PawIcon, Wordmark } from "@/components/UI";
import { PushBootstrap } from "@/components/PushBootstrap";

function statusTone(s: WalkWithRefs["status"]) {
  if (s === "pending") return "warn" as const;
  if (s === "accepted") return "info" as const;
  if (s === "in_progress") return "accent" as const;
  if (s === "completed") return "ok" as const;
  return "neutral" as const;
}

function statusLabel(s: WalkWithRefs["status"]) {
  if (s === "in_progress") return "Walking";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    } catch {}
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
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  const active = walks.find(
    (w) => w.status === "accepted" || w.status === "in_progress",
  );

  return (
    <main className="min-h-screen pb-28">
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
        <p className="text-sm text-stone">Good day,</p>
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          {profile.name.split(" ")[0]}.
        </h1>
      </section>

      <section className="space-y-4 px-5 py-6">
        <PushBootstrap />
        {active && (
          <Link href={`/owner/walk/${active.id}`}>
            <Card tone="dark">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-lime">
                    {active.status === "in_progress" ? "Walking now" : "Walker on the way"}
                  </div>
                  <div className="mt-1.5 font-serif text-lg">
                    {active.walker_name || "Walker"} · {active.dog_name}
                  </div>
                  <div className="mt-0.5 text-sm text-bone/70">
                    {active.area} · {active.duration_min} min
                  </div>
                </div>
                <PawIcon className="h-6 w-6 text-lime" />
              </div>
            </Card>
          </Link>
        )}

        <div className="flex items-baseline justify-between pt-2">
          <h2 className="font-serif text-lg">Your dogs</h2>
          <Link
            href="/owner/request"
            className="text-sm font-medium text-midnight underline underline-offset-2"
          >
            Request a walk
          </Link>
        </div>

        {dogs.length === 0 ? (
          <Empty
            title="No dogs yet"
            body="Add your dog to request a walk."
            action={
              <Button as="link" href="/owner/request" full={false}>
                Add dog
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-paper rounded-2xl border border-paper">
            {dogs.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-midnight/70">
                  <PawIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-stone">
                    {d.breed || "Mixed"} · {d.size || "medium"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4">
          <h2 className="mb-3 font-serif text-lg">Recent walks</h2>
          {walks.length === 0 ? (
            <p className="text-sm text-stone">
              Your walk history will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-paper rounded-2xl border border-paper">
              {walks.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/owner/walk/${w.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-4 transition hover:bg-paper/40"
                  >
                    <div>
                      <div className="font-medium">{w.dog_name}</div>
                      <div className="mt-0.5 text-xs text-stone">
                        {w.area} · {w.duration_min} min · AED {w.price_aed}
                      </div>
                      <div className="mt-1 text-xs text-stone/80">
                        {w.scheduled_for
                          ? `Scheduled · ${fmtSchedule(w.scheduled_for)}`
                          : timeAgo(w.created_at)}
                      </div>
                    </div>
                    <Badge tone={statusTone(w.status)}>
                      {statusLabel(w.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-paper bg-bone px-5 py-3">
        <Button onClick={() => router.push("/owner/request")}>Request a walk</Button>
      </nav>
    </main>
  );
}

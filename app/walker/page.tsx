"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getActiveWalkForWalker,
  getAllWalks,
  getOpenWalks,
  getUser,
  signOut,
  User,
  WalkRequest,
} from "@/lib/store";
import { Badge, Button, Card, Empty, Header } from "@/components/UI";

function timeAgo(ts: number) {
  const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WalkerHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState<WalkRequest[]>([]);
  const [active, setActive] = useState<WalkRequest | null>(null);
  const [completed, setCompleted] = useState<WalkRequest[]>([]);
  const [filterArea, setFilterArea] = useState<boolean>(true);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/");
      return;
    }
    if (u.role !== "walker") {
      router.replace("/owner");
      return;
    }
    setUser(u);
    const tick = () => {
      setOpen(getOpenWalks(filterArea && u.area ? u.area : undefined));
      setActive(getActiveWalkForWalker(u.id));
      setCompleted(
        getAllWalks()
          .filter((w) => w.walkerId === u.id && w.status === "completed")
          .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
          .slice(0, 5),
      );
    };
    tick();
    const int = setInterval(tick, 1500);
    return () => clearInterval(int);
  }, [router, filterArea]);

  if (!user) return null;

  const earnings = completed.reduce((sum, w) => sum + w.priceAed, 0);

  return (
    <main className="min-h-screen pb-6">
      <Header
        title={`Hi, ${user.name.split(" ")[0]}`}
        right={
          <button
            onClick={() => {
              signOut();
              router.replace("/");
            }}
            className="text-xs font-medium text-ink-500"
          >
            Sign out
          </button>
        }
      />

      <section className="space-y-4 px-5 py-5">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <div className="text-xs uppercase tracking-wide text-brand-100">
            This week&apos;s earnings
          </div>
          <div className="mt-1 text-3xl font-bold">AED {earnings}</div>
          <div className="mt-1 text-sm text-brand-100">
            {completed.length} walk{completed.length === 1 ? "" : "s"} completed
          </div>
        </Card>

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
                    {active.dogName} · {active.area}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-500">
                    {active.durationMin} min · AED {active.priceAed}
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
            My area only ({user.area})
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
                        {w.dogName}{" "}
                        <span className="text-sm font-normal text-ink-500">
                          · {w.dogBreed}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm text-ink-500">
                        {w.area} · {w.durationMin} min
                      </div>
                      <div className="mt-1 text-xs text-ink-500">
                        {timeAgo(w.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">AED {w.priceAed}</div>
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
              {completed.map((w) => (
                <Card key={w.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{w.dogName}</div>
                      <div className="text-xs text-ink-500">
                        {w.area} · {w.durationMin} min
                      </div>
                    </div>
                    <div className="font-semibold">AED {w.priceAed}</div>
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminStats,
  AdminWalkerRow,
  WalkWithRefs,
  getAdminStats,
  getAllActiveWalks,
  getAllWalks,
  getMyProfile,
  getPendingWalkers,
  getWalkersByStatus,
  signOut,
  Profile,
} from "@/lib/db";
import { getSupabase } from "@/lib/supabase";
import { Badge, Button, Card, Empty, Header, Wordmark } from "@/components/UI";

function money(aed: number) {
  return `AED ${aed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function timeAgo(ts: string | null | undefined) {
  if (!ts) return "—";
  const mins = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusTone(s: string): "neutral" | "warn" | "ok" | "info" | "accent" {
  switch (s) {
    case "pending":
      return "warn";
    case "accepted":
      return "info";
    case "in_progress":
      return "accent";
    case "completed":
      return "ok";
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}

function paymentTone(s: string | null | undefined): "neutral" | "warn" | "ok" | "info" {
  switch (s) {
    case "paid":
      return "ok";
    case "failed":
      return "warn";
    case "unpaid":
      return "neutral";
    case "refunded":
      return "info";
    default:
      return "neutral";
  }
}

export default function AdminHome() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<AdminWalkerRow[]>([]);
  const [rejected, setRejected] = useState<AdminWalkerRow[]>([]);
  const [active, setActive] = useState<WalkWithRefs[]>([]);
  const [recent, setRecent] = useState<WalkWithRefs[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<AdminWalkerRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [s, p, a, r] = await Promise.all([
        getAdminStats(),
        getPendingWalkers(),
        getAllActiveWalks(),
        getAllWalks(15),
      ]);
      setStats(s);
      setPending(p);
      setActive(a);
      setRecent(r);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const me = await getMyProfile();
      if (!me) {
        router.replace("/");
        return;
      }
      if (!me.is_admin) {
        // Not an admin — bounce them to their normal home
        router.replace(me.role === "walker" ? "/walker" : "/owner");
        return;
      }
      setProfile(me);
      await refresh();
      setLoading(false);
    })();
  }, [router, refresh]);

  // Light auto-refresh so live walks + fresh signups appear without reloads
  useEffect(() => {
    if (!profile) return;
    const int = setInterval(refresh, 15000);
    return () => clearInterval(int);
  }, [profile, refresh]);

  async function postAdmin(path: string, body: object) {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    if (!res.ok || !json?.ok) {
      throw new Error(json?.reason || `Request failed (${res.status})`);
    }
  }

  async function approve(walkerId: string) {
    setActioning(walkerId);
    try {
      await postAdmin("/api/admin/approve-walker", { walker_id: walkerId });
      await refresh();
    } catch (e: any) {
      alert(e.message || "Could not approve walker");
    } finally {
      setActioning(null);
    }
  }

  async function confirmReject() {
    if (!rejectDialog) return;
    const walkerId = rejectDialog.id;
    setActioning(walkerId);
    try {
      await postAdmin("/api/admin/reject-walker", {
        walker_id: walkerId,
        notes: rejectReason.trim(),
      });
      setRejectDialog(null);
      setRejectReason("");
      await refresh();
    } catch (e: any) {
      alert(e.message || "Could not reject walker");
    } finally {
      setActioning(null);
    }
  }

  async function toggleRejected() {
    const next = !showRejected;
    setShowRejected(next);
    if (next && rejected.length === 0) {
      try {
        const r = await getWalkersByStatus("rejected");
        setRejected(r);
      } catch {}
    }
  }

  if (loading || !profile || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading admin…
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <Header
        title="Admin"
        right={
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="text-xs text-stone hover:text-midnight"
          >
            Sign out
          </button>
        }
      />

      <div className="mx-auto max-w-5xl px-5 pt-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Wordmark className="text-stone" />
            <h1 className="mt-1 font-serif text-3xl leading-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-stone">
              Signed in as {profile.name}
            </p>
          </div>
          <Link
            href="/owner"
            className="text-xs text-stone hover:text-midnight"
          >
            View as owner →
          </Link>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="Pending walkers"
            value={stats.pending_walkers}
            tone={stats.pending_walkers > 0 ? "warn" : "default"}
          />
          <StatTile label="Walks right now" value={stats.active_walks} tone="accent" />
          <StatTile label="Walks today" value={stats.walks_today} />
          <StatTile
            label="Revenue this month"
            value={money(stats.revenue_this_month_aed)}
            sub={`${money(stats.platform_fees_this_month_aed)} in fees`}
          />
          <StatTile label="Approved walkers" value={stats.approved_walkers} />
          <StatTile label="Total owners" value={stats.total_owners} />
          <StatTile label="Total walkers" value={stats.total_walkers} />
        </div>

        {/* Pending walker approvals */}
        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-serif text-xl">Pending walker approvals</h2>
            <button
              onClick={toggleRejected}
              className="text-xs text-stone hover:text-midnight"
            >
              {showRejected ? "Hide rejected" : "Show rejected"}
            </button>
          </div>

          {pending.length === 0 ? (
            <Empty
              title="All caught up"
              body="No walkers waiting for review."
            />
          ) : (
            <div className="space-y-3">
              {pending.map((w) => (
                <WalkerReviewCard
                  key={w.id}
                  walker={w}
                  busy={actioning === w.id}
                  onApprove={() => approve(w.id)}
                  onReject={() => {
                    setRejectDialog(w);
                    setRejectReason("");
                  }}
                />
              ))}
            </div>
          )}

          {showRejected && rejected.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone">
                Previously rejected
              </h3>
              <div className="space-y-3">
                {rejected.map((w) => (
                  <WalkerReviewCard
                    key={w.id}
                    walker={w}
                    busy={actioning === w.id}
                    showReapprove
                    onApprove={() => approve(w.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Active walks */}
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-xl">Walks happening now</h2>
          {active.length === 0 ? (
            <Empty title="Quiet right now" body="No walks in progress." />
          ) : (
            <Card className="!p-0">
              <WalksTable walks={active} />
            </Card>
          )}
        </section>

        {/* Recent walks */}
        <section>
          <h2 className="mb-3 font-serif text-xl">Recent walks</h2>
          {recent.length === 0 ? (
            <Empty title="No walks yet" body="They'll show up here as owners book them." />
          ) : (
            <Card className="!p-0">
              <WalksTable walks={recent} />
            </Card>
          )}
        </section>
      </div>

      {/* Reject dialog */}
      {rejectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/40 px-5"
          onClick={() => !actioning && setRejectDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bone p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl">
              Reject {rejectDialog.name}?
            </h3>
            <p className="mt-1 text-sm text-stone">
              They'll see your note and can update their profile and apply again.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (shown to the walker). Optional."
              rows={4}
              maxLength={500}
              className="mt-4 w-full rounded-lg border border-chalk bg-bone px-3 py-3 text-sm text-midnight placeholder:text-stone/60 focus:border-midnight focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setRejectDialog(null)}
                disabled={!!actioning}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmReject}
                disabled={!!actioning}
              >
                {actioning ? "Rejecting…" : "Reject walker"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- small inline components ---------- */

function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warn" | "accent";
}) {
  const bg =
    tone === "warn"
      ? "bg-paper border-amber2/40"
      : tone === "accent"
        ? "bg-lime/20 border-lime"
        : "bg-bone border-paper";
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl leading-none text-midnight">
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-stone">{sub}</div>}
    </div>
  );
}

function WalkerReviewCard({
  walker,
  busy,
  onApprove,
  onReject,
  showReapprove,
}: {
  walker: AdminWalkerRow;
  busy: boolean;
  onApprove: () => void;
  onReject?: () => void;
  showReapprove?: boolean;
}) {
  const age = (() => {
    if (!walker.date_of_birth) return null;
    const dob = new Date(walker.date_of_birth);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  })();

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-paper">
          {walker.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={walker.photo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl text-stone">
              {walker.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {walker.name}
                {age != null && (
                  <span className="ml-2 text-sm text-stone">{age}y</span>
                )}
              </div>
              <div className="truncate text-xs text-stone">
                {walker.area || "no area"}
                {walker.community ? ` · ${walker.community}` : ""}
                {walker.phone ? ` · ${walker.phone}` : ""}
              </div>
            </div>
            <Badge tone={walker.approval_status === "rejected" ? "warn" : "neutral"}>
              {walker.approval_status}
            </Badge>
          </div>

          {walker.bio && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-midnight/80">
              {walker.bio}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
            {walker.years_experience != null && (
              <span>{walker.years_experience}y experience</span>
            )}
            {walker.hourly_rate_aed != null && (
              <span>AED {walker.hourly_rate_aed}/hr</span>
            )}
            {walker.languages && walker.languages.length > 0 && (
              <span>Languages: {walker.languages.join(", ")}</span>
            )}
            {walker.areas_served && walker.areas_served.length > 0 && (
              <span>Serves: {walker.areas_served.join(", ")}</span>
            )}
            <span>Signed up {timeAgo(walker.profile_created_at)}</span>
          </div>

          {walker.approval_notes && (
            <div className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-midnight/70">
              Previous rejection note: {walker.approval_notes}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              onClick={onApprove}
              disabled={busy}
              full={false}
            >
              {busy ? "…" : showReapprove ? "Re-approve" : "Approve"}
            </Button>
            {onReject && (
              <Button
                variant="secondary"
                onClick={onReject}
                disabled={busy}
                full={false}
              >
                Reject
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function WalksTable({ walks }: { walks: WalkWithRefs[] }) {
  return (
    <div className="divide-y divide-paper">
      {walks.map((w) => (
        <Link
          key={w.id}
          href={`/walk/${w.id}`}
          className="flex items-center gap-3 px-5 py-3 hover:bg-paper/50"
        >
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-paper">
            {w.dog_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={w.dog_photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-stone">
                🐾
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {w.dog_name || "the dog"}
              <span className="text-stone"> · {w.owner_name || "—"}</span>
            </div>
            <div className="truncate text-xs text-stone">
              {w.area}
              {w.community ? ` · ${w.community}` : ""}
              {" · "}
              {w.duration_min}m · AED {w.price_aed}
              {w.walker_name ? ` · ${w.walker_name}` : ""}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone={statusTone(w.status)}>{w.status.replace("_", " ")}</Badge>
            {w.payment_status && (
              <Badge tone={paymentTone(w.payment_status)}>{w.payment_status}</Badge>
            )}
            <span className="text-[10px] text-stone">{timeAgo(w.created_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

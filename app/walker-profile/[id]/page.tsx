"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getProfile,
  getReviewsForWalker,
  getWalkerProfile,
  Profile,
  Review,
  WalkerProfile,
} from "@/lib/db";
import { Badge, Card, Header } from "@/components/UI";

export default function WalkerPublicProfile() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [p, setP] = useState<Profile | null>(null);
  const [wp, setWp] = useState<WalkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prof, walker, revs] = await Promise.all([
          getProfile(params.id),
          getWalkerProfile(params.id),
          getReviewsForWalker(params.id),
        ]);
        if (!prof || prof.role !== "walker") {
          setMissing(true);
          return;
        }
        setP(prof);
        setWp(walker);
        setReviews(revs);
      } catch {
        setMissing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-ink-500">Loading…</div>;
  if (missing || !p) {
    return (
      <main className="min-h-screen">
        <Header title="Walker" back="/" />
        <div className="p-8 text-center text-ink-500">Walker not found.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header title={p.name} back="/" />

      <section className="space-y-4 px-5 py-5">
        <div className="flex flex-col items-center text-center">
          {wp?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wp.photo_url}
              alt={p.name}
              className="h-28 w-28 rounded-full object-cover shadow"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-100 text-5xl shadow">
              🚶
            </div>
          )}
          <h1 className="mt-3 text-xl font-bold">{p.name}</h1>
          <div className="mt-1 text-sm text-ink-500">
            {wp?.rating_avg
              ? `★ ${wp.rating_avg} · ${wp.rating_count} review${wp.rating_count === 1 ? "" : "s"}`
              : "No reviews yet"}
            {wp?.id_verified && <> · <span className="text-emerald-700">✓ Verified</span></>}
          </div>
          {p.area && (
            <div className="mt-1 text-sm text-ink-500">Based in {p.area}</div>
          )}
          {wp?.hourly_rate_aed && (
            <div className="mt-2 text-sm font-semibold">
              From AED {wp.hourly_rate_aed} / walk
            </div>
          )}
        </div>

        {wp?.bio && (
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-500">
              About
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">
              {wp.bio}
            </p>
          </Card>
        )}

        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {wp?.years_experience != null && (
              <div>
                <div className="text-xs text-ink-500">Experience</div>
                <div className="font-semibold">
                  {wp.years_experience} year{wp.years_experience === 1 ? "" : "s"}
                </div>
              </div>
            )}
            {wp?.languages && wp.languages.length > 0 && (
              <div>
                <div className="text-xs text-ink-500">Languages</div>
                <div className="font-semibold">{wp.languages.join(", ")}</div>
              </div>
            )}
          </div>
          {wp?.areas_served && wp.areas_served.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-ink-500">Areas served</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {wp.areas_served.map((a) => (
                  <Badge key={a} tone="info">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div>
          <h2 className="mb-2 font-semibold">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-100 bg-brand-50 p-6 text-center text-sm text-ink-500">
              No reviews yet — this walker is new.
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {"★".repeat(r.rating)}
                      <span className="text-ink-300">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </div>
                    <div className="text-xs text-ink-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-ink-700">{r.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

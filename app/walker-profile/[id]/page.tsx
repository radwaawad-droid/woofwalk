"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ageFromDOB,
  getProfile,
  getReviewsForWalker,
  getWalkerProfile,
  Profile,
  Review,
  WalkerProfile,
} from "@/lib/db";
import { Header, PawIcon } from "@/components/UI";

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }
  if (missing || !p) {
    return (
      <main className="min-h-screen">
        <Header title="" back="/" />
        <div className="px-5 py-16 text-center">
          <h1 className="font-serif text-2xl">Walker not found.</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-8">
      <Header title="" back="/" />

      {/* Hero — portrait + name on bone with subtle paper band behind */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-40 bg-paper/60" />
        <div className="relative flex flex-col items-center px-5 pt-6 pb-8">
          {wp?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wp.photo_url}
              alt={p.name}
              className="h-32 w-32 rounded-full object-cover ring-4 ring-bone shadow-lg"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-bone ring-4 ring-bone shadow-lg">
              <PawIcon className="h-10 w-10 text-midnight/50" />
            </div>
          )}
          <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tightest">
            {p.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-stone">
            {wp?.rating_avg ? (
              <span>
                <span className="text-midnight">★ {wp.rating_avg}</span> ·{" "}
                {wp.rating_count} review
                {wp.rating_count === 1 ? "" : "s"}
              </span>
            ) : (
              <span>New walker</span>
            )}
            {ageFromDOB(wp?.date_of_birth) !== null && (
              <>
                <span className="text-chalk">·</span>
                <span>{ageFromDOB(wp?.date_of_birth)} years old</span>
              </>
            )}
            {p.area && (
              <>
                <span className="text-chalk">·</span>
                <span>Based in {p.area}</span>
              </>
            )}
            {wp?.id_verified && (
              <>
                <span className="text-chalk">·</span>
                <span className="text-emerald2">✓ Verified</span>
              </>
            )}
          </div>
          {wp?.hourly_rate_aed && (
            <div className="mt-4 rounded-full border border-chalk bg-bone px-4 py-1.5 text-sm font-medium">
              From AED {wp.hourly_rate_aed} / walk
            </div>
          )}
        </div>
      </section>

      <section className="space-y-8 px-5 py-6">
        {/* Bio */}
        {wp?.bio && (
          <div>
            <h2 className="font-serif text-base mb-2">About</h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-midnight/85">
              {wp.bio}
            </p>
          </div>
        )}

        {/* Facts strip */}
        {(wp?.years_experience != null ||
          (wp?.languages && wp.languages.length > 0)) && (
          <div className="grid grid-cols-2 gap-6 border-y border-paper py-5">
            {wp?.years_experience != null && (
              <div>
                <div className="text-xs text-stone">Experience</div>
                <div className="mt-1 font-serif text-xl tracking-tightest">
                  {wp.years_experience} year
                  {wp.years_experience === 1 ? "" : "s"}
                </div>
              </div>
            )}
            {wp?.languages && wp.languages.length > 0 && (
              <div>
                <div className="text-xs text-stone">Languages</div>
                <div className="mt-1 text-sm font-medium">
                  {wp.languages.join(", ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Areas served */}
        {wp?.areas_served && wp.areas_served.length > 0 && (
          <div>
            <h2 className="font-serif text-base mb-3">Areas</h2>
            <div className="flex flex-wrap gap-2">
              {wp.areas_served.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-paper bg-paper/40 px-3 py-1 text-xs text-midnight"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="font-serif text-base mb-3">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-chalk bg-paper/30 px-5 py-8 text-center text-sm text-stone">
              No reviews yet — this walker is new.
            </div>
          ) : (
            <ul className="divide-y divide-paper rounded-2xl border border-paper">
              {reviews.map((r) => (
                <li key={r.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-midnight">
                        {"★".repeat(r.rating)}
                      </span>
                      <span className="text-chalk">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </div>
                    <div className="text-xs text-stone">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-midnight/85">{r.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

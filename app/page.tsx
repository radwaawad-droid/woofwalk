"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "@/lib/db";
import { Button, PawIcon, Wordmark } from "@/components/UI";

export default function Landing() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        if (p) {
          router.replace(p.role === "owner" ? "/owner" : "/walker");
          return;
        }
      } catch {
        /* not signed in — fall through */
      }
      setChecked(true);
    })();
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        <span className="animate-pulse">Loading</span>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <Wordmark />
        <Link
          href="/login"
          className="text-sm font-medium text-midnight/70 hover:text-midnight"
        >
          Log in
        </Link>
      </div>

      {/* Hero */}
      <section className="relative px-5 pt-14 pb-6">
        <h1 className="font-serif text-[56px] leading-[0.95] tracking-tightest text-midnight">
          Hand over
          <br />
          the{" "}
          <span className="pencil-mark italic">leash</span>.
        </h1>

        <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-midnight/75">
          Trusted dog walkers around Dubai — matched, met, and paid through one
          simple app.
        </p>

        {/* Subtle paw sweep in the background */}
        <div className="pointer-events-none absolute right-0 top-10 opacity-[0.07]">
          <PawIcon className="h-56 w-56 -rotate-12 text-midnight" />
        </div>
      </section>

      {/* CTAs */}
      <section className="px-5 pt-6">
        <div className="space-y-3">
          <Button as="link" href="/signup" variant="primary">
            Create account
          </Button>
          <Button as="link" href="/login" variant="secondary">
            I already have an account
          </Button>
        </div>
      </section>

      {/* How it works — hairline list, not cards */}
      <section className="mt-14 px-5">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium">How it works</h2>
          <span className="text-xs text-stone">30 min from AED 70</span>
        </div>

        <ol className="divide-y divide-paper">
          <HowItem
            index="One"
            title="Tell us about your dog"
            body="A few details so the right walker takes the job — breed, size, any quirks."
          />
          <HowItem
            index="Two"
            title="A walker nearby accepts"
            body="You see their photo, rating and bio before they arrive. Vetted walkers only."
          />
          <HowItem
            index="Three"
            title="Live updates, pay on the finish"
            body="Photos mid-walk, a note at the end, payment settled only when the walk is done."
          />
        </ol>
      </section>

      {/* Walker invite — flipped palette so it reads as a different audience */}
      <section className="mx-5 mt-14 rounded-3xl bg-midnight p-6 text-bone">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-lime">
              For walkers
            </p>
            <h3 className="mt-2 font-serif text-2xl leading-tight">
              Walk dogs.
              <br />
              Get paid weekly.
            </h3>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-bone/80">
              Pick your hours, your neighbourhoods, your dogs. Reviews and
              earnings build with every walk.
            </p>
          </div>
          <PawIcon className="h-10 w-10 shrink-0 text-lime" />
        </div>
        <div className="mt-5">
          <Link
            href="/signup?role=walker"
            className="inline-flex items-center justify-center rounded-full border border-bone/40 px-4 py-2.5 text-sm font-medium text-bone transition hover:bg-bone hover:text-midnight"
          >
            Apply to walk dogs
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 px-5 pb-8 pt-6 text-xs text-stone">
        <div className="flex items-center justify-between">
          <span>Dubai · All neighbourhoods coming online</span>
          <span>v0.3</span>
        </div>
      </footer>
    </main>
  );
}

function HowItem({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5 py-5">
      <div className="shrink-0 pt-0.5">
        <span className="font-serif text-sm italic text-stone">{index}</span>
      </div>
      <div>
        <h3 className="font-medium text-midnight">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-midnight/70">{body}</p>
      </div>
    </li>
  );
}

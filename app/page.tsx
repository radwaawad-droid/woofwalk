"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

      {/* How it works — swipeable story strip */}
      <section className="mt-16">
        <div className="mb-5 flex items-baseline justify-between px-5">
          <h2 className="font-serif text-lg font-medium">How it works</h2>
          <span className="text-xs text-stone">30 min from AED 70</span>
        </div>

        <StoryStrip />
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

type Story = {
  index: string;
  title: string;
  body: string;
  image: string;
  alt: string;
};

const STORIES: Story[] = [
  {
    index: "One",
    title: "Tell us about your dog",
    body: "Breed, size, a quirk or two. On file so you don't retype it.",
    image: "/story/scene-dog.jpg",
    alt: "A golden retriever waiting by the door, leash on a hook",
  },
  {
    index: "Two",
    title: "A nearby walker accepts",
    body: "Photo, rating and bio before they arrive. Vetted walkers only.",
    image: "/story/scene-walker.jpg",
    alt: "A walker in Dubai approaching with a map pin on their phone",
  },
  {
    index: "Three",
    title: "Pay when it's done",
    body: "Photos mid-walk, a short report at the end. Card charged on finish.",
    image: "/story/scene-walk.jpg",
    alt: "A walker and golden retriever on a Dubai promenade at sunrise",
  },
];

function StoryStrip() {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Track which card is in view
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with highest intersectionRatio among currently intersecting
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best) {
          const idx = Number((best.target as HTMLElement).dataset.index);
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      {
        root: scroller,
        threshold: [0.55, 0.75, 1],
      },
    );
    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollToIndex(i: number) {
    const el = itemRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <>
      {/* Horizontal, snap-scroll strip */}
      <div
        ref={scrollerRef}
        className="scrollbar-hide snap-x snap-mandatory overflow-x-auto"
        style={{
          scrollPaddingLeft: 20,
          scrollPaddingRight: 20,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <ol className="flex gap-3 px-5 pb-2">
          {STORIES.map((s, i) => (
            <li
              key={s.index}
              data-index={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="w-[72vw] max-w-[280px] shrink-0 snap-center"
            >
              {/* Illustration */}
              <div className="relative overflow-hidden rounded-[22px] border border-paper bg-paper/40">
                <div className="absolute left-4 top-3 z-10 rounded-full bg-bone/85 px-2.5 py-0.5 font-serif text-xs italic text-stone backdrop-blur-sm">
                  {s.index}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt={s.alt}
                  className="block aspect-square w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
              </div>
              {/* Caption */}
              <div className="mt-3 px-0.5">
                <h3 className="font-serif text-base leading-snug text-midnight">
                  {s.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-midnight/70">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Pagination — tappable dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {STORIES.map((_, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                isActive ? "w-6 bg-midnight" : "w-1.5 bg-chalk"
              }`}
            />
          );
        })}
      </div>
    </>
  );
}

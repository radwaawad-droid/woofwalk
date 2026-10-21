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

      {/* How it works — hand-drawn story */}
      <section className="mt-16 px-5">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium">How it works</h2>
          <span className="text-xs text-stone">30 min from AED 70</span>
        </div>

        <ol className="space-y-10">
          <StoryTile
            index="One"
            title="Tell us about your dog"
            body="Breed, size, a quirk or two. We keep it on file so you don't retype it next time."
            image="/story/scene-dog.jpg"
            alt="A golden retriever waiting by the door, leash hanging on a hook beside it"
          />
          <StoryTile
            index="Two"
            title="A nearby walker accepts"
            body="You see their photo, rating and bio before they arrive. Only vetted walkers in the pool."
            image="/story/scene-walker.jpg"
            alt="A walker in Dubai approaching with their phone, a green map pin on the screen"
          />
          <StoryTile
            index="Three"
            title="Photos, a note, pay at the finish"
            body="Updates mid-walk, a short report at the end. Your card is charged only once the walk is done."
            image="/story/scene-walk.jpg"
            alt="A walker and golden retriever on a Dubai promenade at sunrise, a photo message floating overhead"
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

function StoryTile({
  index,
  title,
  body,
  image,
  alt,
}: {
  index: string;
  title: string;
  body: string;
  image: string;
  alt: string;
}) {
  return (
    <li>
      {/* Illustration — a painted scene, full-bleed in a soft paper frame */}
      <div className="relative overflow-hidden rounded-[28px] border border-paper bg-paper/40">
        <div className="absolute left-5 top-4 z-10 rounded-full bg-bone/80 px-2.5 py-0.5 font-serif text-sm italic text-stone backdrop-blur-sm">
          {index}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={alt}
          className="block aspect-square w-full object-cover"
          loading="lazy"
        />
      </div>
      {/* Caption */}
      <div className="mt-4 px-1">
        <h3 className="font-serif text-xl leading-snug text-midnight">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-midnight/70">
          {body}
        </p>
      </div>
    </li>
  );
}

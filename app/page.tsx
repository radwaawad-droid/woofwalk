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
            illustration={<SceneDog />}
          />
          <StoryTile
            index="Two"
            title="A nearby walker accepts"
            body="You see their photo, rating and bio before they arrive. Only vetted walkers in the pool."
            illustration={<SceneWalker />}
          />
          <StoryTile
            index="Three"
            title="Photos, a note, pay at the finish"
            body="Updates mid-walk, a short report at the end. Your card is charged only once the walk is done."
            illustration={<SceneWalk />}
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
  illustration,
}: {
  index: string;
  title: string;
  body: string;
  illustration: React.ReactNode;
}) {
  return (
    <li>
      {/* Illustration tile: paper-tinted background with a hairline border */}
      <div className="relative overflow-hidden rounded-[28px] border border-paper bg-paper/40">
        <div className="absolute left-5 top-4 font-serif text-sm italic text-stone">
          {index}
        </div>
        <div className="flex h-56 items-center justify-center px-6">
          {illustration}
        </div>
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

/* --- Scene 1: a dog by a door, keys in frame --- */
function SceneDog() {
  return (
    <svg
      viewBox="0 0 240 180"
      className="h-full w-full"
      role="img"
      aria-label="A dog waiting by the door with keys in the owner's hand"
    >
      <g
        fill="none"
        stroke="#0E1C2F"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Door frame (left side), slightly skewed to feel hand-drawn */}
        <path d="M18 36 L18 164" />
        <path d="M18 36 Q 46 32 72 34 L 72 164" />
        <path d="M18 164 L 72 164" />
        {/* Door knob */}
        <circle cx="63" cy="104" r="2.5" fill="#0E1C2F" />

        {/* Floor line */}
        <path d="M4 164 Q 120 170 236 162" />

        {/* Dog — sitting, facing right */}
        {/* Body + rear */}
        <path d="M118 150 Q 114 130 128 118 Q 150 108 174 118 Q 184 124 182 148 L 180 158" />
        {/* Front legs */}
        <path d="M138 148 L 138 162" />
        <path d="M152 148 L 152 162" />
        {/* Rear leg hint */}
        <path d="M176 150 Q 180 158 178 162" />
        {/* Head */}
        <path d="M180 128 Q 192 124 198 118 Q 206 110 212 112 Q 220 116 218 128 Q 216 138 202 142 Q 192 144 184 140" />
        {/* Ear flopping */}
        <path d="M196 112 Q 190 108 186 118 Q 184 124 190 128" />
        {/* Eye */}
        <circle cx="206" cy="124" r="1.3" fill="#0E1C2F" />
        {/* Snout */}
        <path d="M216 128 Q 222 128 224 132" />
        {/* Nose dot */}
        <circle cx="224" cy="131" r="1.4" fill="#0E1C2F" />
        {/* Tail curling up */}
        <path d="M118 134 Q 108 122 114 110 Q 120 100 112 94" />

        {/* Owner's hand with keys — reaching in from top-right */}
        <path d="M232 44 Q 220 48 212 56 Q 206 62 206 68" />
        {/* Key ring */}
        <circle cx="206" cy="72" r="4" />
        {/* Key teeth */}
        <path d="M206 76 L 206 86 L 210 86 M 206 82 L 209 82" />
      </g>

      {/* Lime accent — a small heart/paw suggesting affection */}
      <g transform="translate(90 52)" fill="#D8E86B" stroke="#0E1C2F" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M8 14 Q 0 10 2 4 Q 5 0 8 4 Q 11 0 14 4 Q 16 10 8 14 Z" />
      </g>
    </svg>
  );
}

/* --- Scene 2: a walker approaching, phone in hand --- */
function SceneWalker() {
  return (
    <svg
      viewBox="0 0 240 180"
      className="h-full w-full"
      role="img"
      aria-label="A walker arriving with their phone"
    >
      <g
        fill="none"
        stroke="#0E1C2F"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Horizon / pavement */}
        <path d="M4 150 Q 120 156 236 148" />
        <path d="M30 158 L 40 158 M 60 160 L 72 160 M 94 158 L 102 158 M 130 160 L 142 160 M 170 158 L 184 158 M 206 160 L 218 160" />

        {/* Walker — mid-stride */}
        {/* Head */}
        <circle cx="120" cy="52" r="12" />
        {/* Hair tuft */}
        <path d="M110 42 Q 118 36 128 42" />
        {/* Body */}
        <path d="M120 64 L 118 108" />
        {/* Arm with phone (bent, up to chest) */}
        <path d="M118 76 Q 108 82 106 94 L 112 102" />
        {/* Phone */}
        <rect x="98" y="96" width="14" height="20" rx="2" />
        {/* Little screen bubble on phone */}
        <path d="M101 102 L 109 102 M 101 106 L 107 106" />
        {/* Other arm, swinging back */}
        <path d="M120 76 Q 134 82 136 98" />
        {/* Legs mid-stride */}
        <path d="M118 108 Q 110 128 102 146" />
        <path d="M118 108 Q 128 126 132 146" />

        {/* Second person far behind (depth) */}
        <circle cx="40" cy="92" r="5" />
        <path d="M40 97 L 40 118 M 40 103 L 34 112 M 40 103 L 46 112 M 40 118 L 36 134 M 40 118 L 44 134" />

        {/* A door frame in the distance where the dog is waiting */}
        <path d="M196 100 L 196 150" />
        <path d="M196 100 Q 212 98 224 100 L 224 150" />
        {/* Doorknob dot */}
        <circle cx="220" cy="128" r="1.5" fill="#0E1C2F" />
      </g>

      {/* Lime accent — notification bubble floating off the phone */}
      <g transform="translate(76 76)">
        <path
          d="M12 2 Q 2 2 2 12 Q 2 20 10 20 L 14 26 L 16 20 Q 22 20 22 12 Q 22 2 12 2 Z"
          fill="#D8E86B"
          stroke="#0E1C2F"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Tiny paw inside bubble */}
        <g fill="#0E1C2F">
          <circle cx="8"  cy="9"  r="1.3" />
          <circle cx="12" cy="7"  r="1.3" />
          <circle cx="16" cy="9"  r="1.3" />
          <ellipse cx="12" cy="14" rx="3" ry="2" />
        </g>
      </g>
    </svg>
  );
}

/* --- Scene 3: dog + walker from behind, mid-walk, photo frame overhead --- */
function SceneWalk() {
  return (
    <svg
      viewBox="0 0 240 180"
      className="h-full w-full"
      role="img"
      aria-label="A walker and dog on a path, with a photo update floating overhead"
    >
      <g
        fill="none"
        stroke="#0E1C2F"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Curving path receding to vanishing point */}
        <path d="M28 164 Q 90 150 130 112 Q 150 92 156 62" />
        <path d="M68 166 Q 118 152 148 118 Q 164 100 170 68" />

        {/* A tree on the right */}
        <path d="M212 150 L 212 118" />
        <path d="M212 118 Q 196 118 192 104 Q 200 94 212 100 Q 224 94 232 104 Q 228 118 212 118 Z" fill="#D8E86B" />

        {/* Walker from behind */}
        {/* Head */}
        <circle cx="110" cy="78" r="10" />
        {/* Body */}
        <path d="M110 88 L 110 124" />
        {/* Arms */}
        <path d="M110 96 Q 100 102 98 114" />
        <path d="M110 96 Q 120 102 124 114" />
        {/* Legs */}
        <path d="M110 124 Q 104 142 100 158" />
        <path d="M110 124 Q 116 140 118 158" />

        {/* Leash (midnight line from walker's hand to dog's neck) */}
        <path d="M124 114 Q 136 124 142 132" />

        {/* Dog from behind, trotting */}
        {/* Body */}
        <path d="M138 134 Q 148 128 160 134 Q 168 136 168 146 L 166 154" />
        {/* Head */}
        <path d="M138 134 Q 132 128 134 122 Q 140 120 144 126" />
        {/* Ear */}
        <path d="M138 124 Q 140 118 144 122" />
        {/* Legs */}
        <path d="M144 148 L 144 158" />
        <path d="M156 148 L 156 158" />
        <path d="M164 150 L 164 158" />
        {/* Tail up and wagging */}
        <path d="M168 134 Q 176 126 174 120" />
      </g>

      {/* Lime accent — photo frame floating as the owner's update */}
      <g transform="translate(28 20)">
        <rect
          x="0"
          y="0"
          width="68"
          height="52"
          rx="3"
          fill="#F6F1E7"
          stroke="#0E1C2F"
          strokeWidth="1.6"
        />
        {/* Image inside — simplified dog silhouette with lime background */}
        <rect x="4" y="4" width="60" height="44" fill="#D8E86B" />
        <g fill="#0E1C2F">
          <ellipse cx="36" cy="32" rx="12" ry="8" />
          <ellipse cx="46" cy="22" rx="5" ry="6" />
          <path d="M50 18 L 52 12 L 48 14 Z" />
          <circle cx="46" cy="22" r="1" fill="#F6F1E7" />
        </g>
        {/* Little "sent" tick */}
        <g
          transform="translate(56 56)"
          fill="none"
          stroke="#0E1C2F"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="4" cy="4" r="4" fill="#D8E86B" />
          <path d="M2 4 L 3.5 5.5 L 6 2.5" />
        </g>
        {/* Little string pinning photo to the top */}
        <path
          d="M34 0 L 34 -14"
          stroke="#0E1C2F"
          strokeWidth="1"
          strokeDasharray="2 2"
          fill="none"
        />
      </g>
    </svg>
  );
}

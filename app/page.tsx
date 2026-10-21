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

/* Shared palette tokens — kept inline to the SVG files for simplicity */
const INK = "#0E1C2F";
const BONE = "#F6F1E7";
const CREAM = "#EBE2CB";  // Soft parchment fill, warmer than bone
const SHADOW = "#C9B99A"; // A muted taupe for undertones
const LIME = "#D8E86B";

/* --- Scene 1: Golden retriever waiting by the door, leash on hook --- */
function SceneDog() {
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-full w-full"
      role="img"
      aria-label="A golden retriever waiting by the door with its leash hanging on a hook"
    >
      {/* Floor band */}
      <path
        d="M0 170 L 300 170 L 300 200 L 0 200 Z"
        fill={CREAM}
        opacity="0.6"
      />
      <path
        d="M0 170 L 300 170"
        stroke={INK}
        strokeWidth="1.4"
        fill="none"
      />

      {/* Floor shadow under the dog */}
      <ellipse cx="178" cy="172" rx="56" ry="4" fill={SHADOW} opacity="0.4" />

      {/* Door frame on left */}
      <g fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M28 42 L 28 170" />
        <path d="M28 42 Q 70 38 112 40 L 112 170" />
        <path d="M20 42 L 120 42" strokeWidth="1" />
        {/* Door panels — subtle rectangles for depth */}
        <rect x="42" y="60"  width="56" height="46" rx="2" opacity="0.5" />
        <rect x="42" y="116" width="56" height="42" rx="2" opacity="0.5" />
      </g>
      {/* Doorknob */}
      <circle cx="102" cy="104" r="2.6" fill={INK} />

      {/* Hook with leash hanging — the lime accent lives here */}
      <g>
        {/* Hook base */}
        <path
          d="M68 54 L 68 60 Q 68 64 72 64"
          stroke={INK}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Leash hanging — a curving loop */}
        <path
          d="M72 64 Q 76 86 68 100 Q 60 112 72 118 Q 86 118 84 102 Q 82 90 74 80"
          stroke={LIME}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Leash clip at the bottom */}
        <circle cx="84" cy="100" r="2" fill={INK} />
      </g>

      {/* === DOG === a sitting golden-retriever shape, facing left */}
      {/* Body silhouette: filled cream, outlined ink */}
      {/* Rear + back */}
      <path
        d="M226 168 Q 232 138 220 118 Q 208 102 184 100 Q 160 102 148 118 Q 136 134 140 158 L 138 168 Q 134 170 134 174 L 230 174 Q 230 170 226 168 Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Chest curve shadow — adds a tiny bit of depth */}
      <path
        d="M150 120 Q 158 148 158 168"
        stroke={SHADOW}
        strokeWidth="1"
        fill="none"
        opacity="0.7"
      />
      {/* Front legs — two parallel columns tucked under chest */}
      <g fill={CREAM} stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M158 148 Q 156 164 160 172 L 170 172 Q 174 164 170 148 Z" />
        <path d="M178 148 Q 176 164 180 172 L 190 172 Q 194 164 190 148 Z" />
      </g>

      {/* Head: lower than top of body, tilted slightly up */}
      {/* Head mass */}
      <path
        d="M118 112 Q 112 104 118 94 Q 126 82 142 82 Q 158 82 164 94 Q 166 102 164 110 Q 164 118 158 124 Q 144 132 128 126 Q 120 122 118 112 Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Drooping ear — golden-retriever style */}
      <path
        d="M156 90 Q 170 96 168 112 Q 164 122 156 120 Q 150 112 152 100 Z"
        fill={SHADOW}
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Snout extending left */}
      <path
        d="M118 106 Q 108 108 104 114 Q 102 120 106 124 Q 112 128 120 124"
        fill={CREAM}
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Nose */}
      <ellipse cx="104" cy="116" rx="3" ry="2.4" fill={INK} />
      {/* Mouth hint */}
      <path
        d="M108 120 Q 112 124 118 122"
        stroke={INK}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      {/* Eye — small, warm */}
      <circle cx="132" cy="104" r="2" fill={INK} />
      <circle cx="131" cy="103" r="0.6" fill={BONE} />
      {/* Eyebrow mark */}
      <path
        d="M128 98 Q 132 96 136 98"
        stroke={INK}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />

      {/* Collar on the neck — subtle ink band, no lime (lime is the leash) */}
      <path
        d="M152 118 Q 156 126 150 130"
        stroke={INK}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tag */}
      <circle cx="149" cy="130" r="1.8" fill={INK} />

      {/* Tail — curled up and over */}
      <path
        d="M226 134 Q 240 122 234 108 Q 228 98 240 92"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* --- Scene 2: a walker approaching, phone in hand, Dubai background --- */
function SceneWalker() {
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-full w-full"
      role="img"
      aria-label="A walker approaching with their phone, map pin visible on screen"
    >
      {/* Sky band — paper tone slightly warmer than background */}
      <rect x="0" y="0" width="300" height="150" fill={BONE} />
      {/* Pavement */}
      <path
        d="M0 150 L 300 150 L 300 200 L 0 200 Z"
        fill={CREAM}
        opacity="0.6"
      />
      <path d="M0 150 L 300 150" stroke={INK} strokeWidth="1.4" fill="none" />
      {/* Pavement texture — small ticks */}
      <g stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.5">
        <path d="M20 162 L 32 162" />
        <path d="M66 164 L 80 164" />
        <path d="M110 162 L 122 162" />
        <path d="M196 164 L 208 164" />
        <path d="M248 162 L 262 162" />
      </g>

      {/* Dubai skyline — soft midnight silhouette in the far distance */}
      <g fill={SHADOW} opacity="0.6">
        <path d="M0 150 L 0 128 L 14 124 L 14 110 L 24 110 L 24 150 Z" />
        <path d="M30 150 L 30 118 L 42 118 L 42 150 Z" />
        <path d="M240 150 L 240 108 L 248 108 L 248 100 L 254 96 L 260 100 L 260 112 L 268 112 L 268 150 Z" />
        <path d="M275 150 L 275 120 L 288 120 L 288 150 Z" />
      </g>

      {/* Palm tree on the right-middle — characteristic Dubai detail */}
      <g>
        {/* Trunk */}
        <path
          d="M212 150 Q 210 128 214 106"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Trunk texture rings */}
        <g stroke={INK} strokeWidth="0.8" fill="none" opacity="0.6">
          <path d="M209 140 Q 212 139 215 140" />
          <path d="M210 128 Q 213 127 216 128" />
          <path d="M212 116 Q 215 115 218 116" />
        </g>
        {/* Palm fronds */}
        <g stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M214 106 Q 198 100 184 108" />
          <path d="M214 106 Q 230 100 244 108" />
          <path d="M214 106 Q 200 92 190 82" />
          <path d="M214 106 Q 228 92 238 82" />
          <path d="M214 106 Q 214 90 214 76" />
        </g>
        {/* Little leaf accents on fronds */}
        <g fill={SHADOW} opacity="0.8">
          <ellipse cx="190" cy="104" rx="4" ry="1.5" transform="rotate(-15 190 104)" />
          <ellipse cx="238" cy="104" rx="4" ry="1.5" transform="rotate(15 238 104)" />
          <ellipse cx="196" cy="88" rx="4" ry="1.5" transform="rotate(-45 196 88)" />
          <ellipse cx="232" cy="88" rx="4" ry="1.5" transform="rotate(45 232 88)" />
        </g>
      </g>

      {/* === WALKER === centered, facing viewer, mid-stride, phone up */}
      <g>
        {/* Shadow under walker */}
        <ellipse cx="130" cy="156" rx="18" ry="2.5" fill={SHADOW} opacity="0.5" />

        {/* Legs — mid stride, filled cream */}
        {/* Back leg (further) */}
        <path
          d="M126 112 Q 122 128 116 148 L 110 156 L 118 156 L 126 142 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Front leg (nearer) */}
        <path
          d="M134 112 Q 138 126 142 148 L 148 156 L 140 156 L 132 140 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Shoes */}
        <path d="M108 154 Q 112 158 120 157" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M138 154 Q 142 158 150 157" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Torso — t-shirt (cream, outlined) */}
        <path
          d="M110 76 Q 114 108 118 114 L 142 114 Q 146 108 150 76 Q 142 70 130 70 Q 118 70 110 76 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* T-shirt collar hint */}
        <path d="M124 72 Q 130 78 136 72" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Shadow strip for depth */}
        <path d="M114 90 Q 117 108 120 112" stroke={SHADOW} strokeWidth="1" fill="none" opacity="0.8" />

        {/* Right arm — down, swinging back */}
        <path
          d="M148 82 Q 158 94 158 110 L 154 112 Q 150 98 144 86 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Hand hint */}
        <circle cx="156" cy="112" r="2.5" fill={CREAM} stroke={INK} strokeWidth="1.2" />

        {/* Left arm — bent, holding phone up to chest */}
        <path
          d="M112 82 Q 100 94 100 110 L 104 118 Q 110 108 116 94 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Hand holding phone */}
        <circle cx="102" cy="118" r="3" fill={CREAM} stroke={INK} strokeWidth="1.2" />

        {/* Head */}
        <path
          d="M114 44 Q 114 32 130 32 Q 146 32 146 44 L 146 60 Q 146 70 130 70 Q 114 70 114 60 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Hair — short, tucked under a cap */}
        <path
          d="M116 44 Q 118 36 130 34 Q 142 34 144 44"
          stroke={INK}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Cap brim */}
        <path
          d="M112 42 Q 120 38 148 42 L 150 46 Q 130 44 112 46 Z"
          fill={INK}
          stroke={INK}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Face hints — small line for eye, hint of smile */}
        <circle cx="124" cy="52" r="1.3" fill={INK} />
        <circle cx="136" cy="52" r="1.3" fill={INK} />
        <path d="M126 60 Q 130 63 134 60" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Ear */}
        <path d="M148 52 Q 152 54 150 60" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>

      {/* Phone in hand, tilted up — screen shows a lime map pin */}
      <g transform="translate(78 92) rotate(-8)">
        {/* Phone body */}
        <rect
          x="0"
          y="0"
          width="24"
          height="36"
          rx="4"
          fill={INK}
          stroke={INK}
          strokeWidth="1.2"
        />
        {/* Screen */}
        <rect x="2" y="4" width="20" height="28" rx="1.5" fill={BONE} />
        {/* Simple map lines on screen */}
        <path d="M2 14 L 22 14 M 2 22 L 22 22" stroke={SHADOW} strokeWidth="0.8" opacity="0.7" />
        <path d="M8 4 L 8 32 M 16 4 L 16 32" stroke={SHADOW} strokeWidth="0.8" opacity="0.7" />
        {/* Lime map pin — the moment the request lands */}
        <g transform="translate(9 10)">
          <path
            d="M3 0 Q 0 0 0 3.5 Q 0 7 3 10 Q 6 7 6 3.5 Q 6 0 3 0 Z"
            fill={LIME}
            stroke={INK}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <circle cx="3" cy="3.5" r="1.2" fill={INK} />
        </g>
      </g>
    </svg>
  );
}

/* --- Scene 3: walker + dog on a park path, phone-shaped photo update floating --- */
function SceneWalk() {
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-full w-full"
      role="img"
      aria-label="A walker and dog on a path together, with a photo update floating overhead"
    >
      {/* Soft rising sun on the horizon — lime semicircle */}
      <g>
        <path
          d="M38 120 Q 60 90 82 120 Z"
          fill={LIME}
          opacity="0.85"
        />
        <path
          d="M38 120 Q 60 90 82 120"
          fill="none"
          stroke={INK}
          strokeWidth="1.2"
        />
      </g>

      {/* Horizon */}
      <path
        d="M0 120 L 300 120"
        stroke={INK}
        strokeWidth="1"
        opacity="0.5"
        fill="none"
      />

      {/* Ground wash */}
      <path
        d="M0 120 L 300 120 L 300 200 L 0 200 Z"
        fill={CREAM}
        opacity="0.5"
      />

      {/* Path receding — two edges with a dirt tone */}
      <path
        d="M30 196 Q 90 170 130 150 Q 160 134 162 120 L 174 120 Q 176 134 192 150 Q 232 170 290 196 Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="1.2"
      />
      {/* Dashed centre line */}
      <path
        d="M166 196 Q 168 170 168 150 Q 168 134 168 120"
        stroke={SHADOW}
        strokeWidth="1"
        strokeDasharray="3 4"
        fill="none"
        opacity="0.7"
      />

      {/* Distant tree silhouettes left */}
      <g fill={SHADOW} opacity="0.55" stroke={INK} strokeWidth="1">
        <path d="M12 128 Q 4 116 12 108 Q 16 100 24 108 Q 32 112 28 120 Q 30 128 20 130 Z" />
        <path d="M18 128 L 18 140" stroke={INK} strokeWidth="1.2" fill="none" />
      </g>

      {/* Shrubs along path */}
      <g fill={SHADOW} opacity="0.7" stroke={INK} strokeWidth="1" strokeLinejoin="round">
        <path d="M232 146 Q 244 130 258 142 Q 268 150 258 152 L 232 152 Z" />
        <path d="M248 164 Q 260 152 272 162 Q 282 170 272 172 L 248 172 Z" />
      </g>

      {/* === WALKER (from behind, left of path) === */}
      <g>
        {/* Shadow on path */}
        <ellipse cx="124" cy="178" rx="18" ry="3" fill={SHADOW} opacity="0.4" />

        {/* Legs — mid stride, from behind */}
        <g fill={CREAM} stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
          <path d="M118 132 Q 114 150 112 174 L 118 178 L 122 174 L 124 150 Z" />
          <path d="M128 132 Q 132 150 136 174 L 128 178 L 122 174 L 124 150 Z" />
        </g>
        {/* Shoes */}
        <path d="M112 176 L 122 178 L 120 180 L 112 180 Z" fill={INK} />
        <path d="M128 178 L 138 176 L 138 180 L 130 180 Z" fill={INK} />

        {/* Shorts */}
        <path
          d="M114 120 L 134 120 L 136 136 L 112 136 Z"
          fill={INK}
          opacity="0.85"
        />

        {/* Torso — t-shirt */}
        <path
          d="M106 86 Q 108 108 112 122 L 136 122 Q 140 108 142 86 Q 136 80 124 80 Q 112 80 106 86 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Back shoulder blade hint */}
        <path d="M118 92 Q 118 100 118 108" stroke={SHADOW} strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M130 92 Q 130 100 130 108" stroke={SHADOW} strokeWidth="0.8" fill="none" opacity="0.7" />

        {/* Arms — one down, one holding leash */}
        <path d="M108 90 Q 100 108 100 124" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M140 90 Q 148 102 150 118" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Head from behind — cap */}
        <path
          d="M114 60 Q 114 48 124 48 Q 134 48 134 60 L 134 76 Q 134 82 124 82 Q 114 82 114 76 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Cap */}
        <path d="M112 58 Q 118 50 136 56 L 138 62 Q 124 60 112 62 Z" fill={INK} />
        {/* Hair at nape */}
        <path d="M118 76 Q 124 80 130 76" stroke={INK} strokeWidth="1.2" fill="none" />
      </g>

      {/* === LEASH === from walker's hand to dog's collar */}
      <path
        d="M150 118 Q 168 128 186 138 Q 200 144 212 148"
        stroke={INK}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* === DOG === from 3/4 behind, ahead on the path */}
      <g>
        {/* Shadow */}
        <ellipse cx="222" cy="182" rx="22" ry="2.5" fill={SHADOW} opacity="0.5" />

        {/* Dog body — trotting */}
        <path
          d="M198 160 Q 194 148 202 142 Q 216 136 234 142 Q 246 146 246 160 L 244 174 Q 240 178 236 176 L 212 176 Q 208 178 204 176 Q 198 174 198 160 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Legs */}
        <g stroke={INK} strokeWidth="1.5" fill={CREAM} strokeLinejoin="round">
          <path d="M206 170 L 204 182 L 210 182 L 212 170 Z" />
          <path d="M218 170 L 216 182 L 222 182 L 224 170 Z" />
          <path d="M230 170 L 228 182 L 234 182 L 236 170 Z" />
          <path d="M242 170 L 240 182 L 246 182 L 246 170 Z" />
        </g>

        {/* Head — looking back a little, 3/4 */}
        <path
          d="M196 150 Q 190 142 196 134 Q 204 128 214 134 Q 218 142 214 150 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Ear flopping */}
        <path
          d="M200 134 Q 204 128 210 132 Q 212 140 206 142"
          fill={SHADOW}
          stroke={INK}
          strokeWidth="1.2"
        />
        {/* Snout hint */}
        <path d="M196 144 Q 192 146 194 150" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Eye */}
        <circle cx="202" cy="142" r="1.2" fill={INK} />

        {/* Collar */}
        <path d="M208 148 Q 212 152 208 154" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Tail — raised and curled, happy */}
        <path
          d="M244 148 Q 256 138 254 124 Q 252 116 260 112"
          stroke={INK}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* === PHONE UPDATE === floating from top, pinned by dashed string */}
      <g transform="translate(28 14)">
        {/* Pin string */}
        <path
          d="M42 0 L 42 -4"
          stroke={INK}
          strokeWidth="1"
          strokeDasharray="2 2"
          fill="none"
        />
        {/* Phone body */}
        <rect
          x="26"
          y="0"
          width="32"
          height="56"
          rx="5"
          fill={INK}
        />
        {/* Screen */}
        <rect x="28" y="5" width="28" height="46" rx="2" fill={BONE} />
        {/* Status bar */}
        <rect x="38" y="7" width="8" height="1.4" rx="0.7" fill={INK} opacity="0.4" />
        {/* Chat header "Rex" */}
        <text
          x="42"
          y="16"
          textAnchor="middle"
          fontSize="4"
          fontFamily="Fraunces, serif"
          fontStyle="italic"
          fill={INK}
        >
          Rex
        </text>
        <path d="M30 18 L 54 18" stroke={INK} strokeWidth="0.5" opacity="0.3" />
        {/* Photo thumbnail in the chat */}
        <rect x="31" y="21" width="22" height="18" rx="1.5" fill={LIME} />
        {/* Simple dog-head silhouette in the photo */}
        <g fill={INK}>
          <ellipse cx="42" cy="32" rx="6" ry="4" />
          <ellipse cx="46" cy="27" rx="2" ry="2.5" />
          <ellipse cx="38" cy="27" rx="2" ry="2.5" />
        </g>
        {/* Message bubble underneath */}
        <path
          d="M31 42 Q 29 42 29 44 L 29 48 Q 29 50 31 50 L 50 50 Q 52 50 52 48 L 52 44 Q 52 42 50 42 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="0.5"
        />
        <path d="M32 45 L 48 45 M 32 47 L 44 47" stroke={INK} strokeWidth="0.4" opacity="0.6" />
      </g>
    </svg>
  );
}

# WoofWalk 🐕

Dog walking on demand in Dubai — a Next.js + Tailwind starter.

This is an **MVP scaffold**: it runs end-to-end with mock data stored in your
browser (localStorage). No backend, no payments, no real GPS — those come next.
It's deliberately small so you can learn the codebase quickly and extend it.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **localStorage** for data (swap for Supabase/Firebase later)
- Deploys to **Vercel** with zero config

## What's working

- Landing page with role picker
- Signup for owner or walker (phone + area)
- Owner: add a dog, request a walk (area, address, duration, auto price)
- Walker: see nearby open requests, accept, start, send photo updates, end
- Owner sees status change live (polls localStorage every 1.5s)
- Earnings summary for walkers
- Mobile-first — add to iPhone home screen for an app-like feel

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Tip:** test the two-sided flow by opening the site in two browsers (e.g.
Chrome + Safari, or Chrome + an incognito window). Sign up as an owner in one
and a walker in the other — same area. Request a walk → see it appear in the
walker view instantly.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo.
3. Click Deploy. Vercel auto-detects Next.js — no settings needed.
4. Done. You get a URL like `woofwalk.vercel.app`.

Every `git push` auto-deploys.

## Project structure

```
app/
  page.tsx                 Landing / role picker
  signup/page.tsx          Owner or walker signup
  login/page.tsx           (demo placeholder)
  owner/
    page.tsx               Owner home: dogs + walks
    request/page.tsx       Request a walk
    walk/[id]/page.tsx     Walk detail (live status)
  walker/
    page.tsx               Walker home: open + earnings
    walk/[id]/page.tsx     Walk detail (accept/start/end)
components/UI.tsx          Shared Button, Card, Field, etc.
lib/store.ts               localStorage data layer (swap for Supabase)
```

## Roadmap — what to add next

- [ ] **Supabase**: real auth (phone OTP), Postgres for walks/dogs, realtime
- [ ] **Google Maps**: pickup pin + live walker location during walks
- [ ] **Push notifications** (OneSignal or Firebase FCM): walker accepted, walk started
- [ ] **Real photo upload** (Supabase Storage)
- [ ] **Stripe**: card on file, charge on completion, walker payouts via Connect
- [ ] **ID verification for walkers** (Sumsub or Onfido — Emirates ID)
- [ ] **Admin dashboard** for walker vetting and dispute resolution
- [ ] **Heat lockout**: block requests when ground temp > 40°C
- [ ] **Arabic translation**
- [ ] **Wrap as iOS app** (Capacitor or Expo) and ship to App Store

## Business setup (before launch)

Not code, but non-negotiable:

- UAE trade license (free zone recommended for cost — IFZA, Meydan, SHAMS)
- Dubai Municipality pet-service approval (check latest requirements)
- Public liability insurance (~AED 2–4k/year)
- Walker contracts (independent contractor terms)
- Terms of service + privacy policy
- Dubai VAT registration if turnover projected > AED 375k/year

## License

Private — all rights reserved to WoofWalk.

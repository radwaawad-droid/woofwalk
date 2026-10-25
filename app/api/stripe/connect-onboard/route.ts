import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Walker clicks 'Set up payouts' → this route creates a Stripe Express
 * account (if one doesn't already exist for them) and returns a hosted
 * AccountLink URL. The walker is redirected to Stripe, completes
 * onboarding, and comes back to the return_url.
 */
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { ok: false, reason: "Supabase service role not set." },
        { status: 503 },
      );
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, reason: "Stripe not configured." },
        { status: 503 },
      );
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";
    if (!token) {
      return NextResponse.json(
        { ok: false, reason: "Not signed in" },
        { status: 401 },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes } = await admin.auth.getUser(token);
    const userId = userRes.user?.id;
    const email = userRes.user?.email || undefined;
    if (!userId) {
      return NextResponse.json(
        { ok: false, reason: "Invalid session" },
        { status: 401 },
      );
    }

    // Only walkers set up payouts
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.role !== "walker") {
      return NextResponse.json(
        { ok: false, reason: "Only walkers can set up payouts." },
        { status: 403 },
      );
    }

    const { data: wp } = await admin
      .from("walker_profiles")
      .select("id, stripe_account_id")
      .eq("id", userId)
      .maybeSingle();

    const stripe = getStripe();

    // Reuse or create the Express account
    let accountId = wp?.stripe_account_id || null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "AE",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { woofwalk_user_id: userId },
      });
      accountId = account.id;
      await admin
        .from("walker_profiles")
        .upsert({ id: userId, stripe_account_id: accountId });
    }

    // Determine the right origin for the return URLs
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "https://woofwalk-psi.vercel.app";

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/walker/profile/edit?onboarding=refresh`,
      return_url: `${origin}/walker/profile/edit?onboarding=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ ok: true, url: link.url });
  } catch (e: any) {
    console.error("connect-onboard error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}

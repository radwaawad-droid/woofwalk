import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pulls the latest state of the walker's Stripe Express account and
 * mirrors it onto walker_profiles so other screens (badge on walker home,
 * eligibility checks in charge-walk) can read it without a Stripe round-trip.
 */
export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, reason: "Server not configured" }, { status: 503 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ ok: true, state: { connected: false } });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";
    if (!token) {
      return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes } = await admin.auth.getUser(token);
    const userId = userRes.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, reason: "Invalid session" }, { status: 401 });
    }

    const { data: wp } = await admin
      .from("walker_profiles")
      .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted")
      .eq("id", userId)
      .maybeSingle();

    if (!wp?.stripe_account_id) {
      return NextResponse.json({
        ok: true,
        state: {
          connected: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
        },
      });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(wp.stripe_account_id);

    const nextState = {
      connected: true,
      details_submitted: account.details_submitted || false,
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
    };

    // Mirror onto walker_profiles so other code paths don't need Stripe to check
    await admin
      .from("walker_profiles")
      .update({
        stripe_details_submitted: nextState.details_submitted,
        stripe_charges_enabled: nextState.charges_enabled,
        stripe_payouts_enabled: nextState.payouts_enabled,
      })
      .eq("id", userId);

    return NextResponse.json({ ok: true, state: nextState });
  } catch (e: any) {
    console.error("connect-status error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}

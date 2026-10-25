import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch the owner's default/saved card so the UI can show "Visa ending 4242"
 * rather than making them re-enter it every time. Returns null if none saved.
 */
export async function GET(req: Request) {
  try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, reason: "Server not configured" }, { status: 503 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    // No Stripe keys yet — just report 'no card on file' instead of erroring,
    // so the UI can still render and prompt the user to set up Stripe
    return NextResponse.json({ ok: true, card: null });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
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

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ ok: true, card: null });
  }

  const stripe = getStripe();
  const methods = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: "card",
    limit: 1,
  });
  const pm = methods.data[0];
  if (!pm || !pm.card) {
    return NextResponse.json({ ok: true, card: null });
  }
  return NextResponse.json({
    ok: true,
    card: {
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
    },
  });
  } catch (e: any) {
    console.error("payment-method GET error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}

/**
 * DELETE — detach the saved card so the owner can replace it.
 */
export async function DELETE(req: Request) {
  try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: true });
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes } = await admin.auth.getUser(token);
  const userId = userRes.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ ok: true });
  }

  const stripe = getStripe();
  const methods = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: "card",
  });
  for (const pm of methods.data) {
    try {
      await stripe.paymentMethods.detach(pm.id);
    } catch {
      /* best effort */
    }
  }
  return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("payment-method DELETE error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}

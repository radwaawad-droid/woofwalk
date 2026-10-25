import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create (or reuse) a Stripe customer for the signed-in owner, then issue
 * a SetupIntent so the browser can collect a card via Stripe Elements
 * without that card ever touching our server. The returned client_secret
 * is used by Elements to confirm the setup.
 */
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, reason: "Server not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) {
    return NextResponse.json({ ok: false, reason: "Invalid session" }, { status: 401 });
  }
  const userId = userRes.user.id;
  const email = userRes.user.email || undefined;

  // Load profile — only owners can save a card for charging
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, name, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "Profile not found" }, { status: 404 });
  }
  if (profile.role !== "owner") {
    return NextResponse.json(
      { ok: false, reason: "Only owners can save a card" },
      { status: 403 },
    );
  }

  const stripe = getStripe();

  // Reuse the customer if we have one; create one otherwise
  let customerId: string | null = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: profile.name,
      metadata: { woofwalk_user_id: userId },
    });
    customerId = customer.id;
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  // SetupIntent for off-session future charges
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { woofwalk_user_id: userId },
  });

  return NextResponse.json({
    ok: true,
    client_secret: setupIntent.client_secret,
    customer_id: customerId,
    publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}

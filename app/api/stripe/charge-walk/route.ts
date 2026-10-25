import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, platformFeeFromPrice } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { walk_id: string };

/**
 * Charge the owner's saved card for a completed walk, off-session.
 * Called from the walker-side 'End walk' flow once the server has
 * transitioned the walk to completed; this route only acts if the walk
 * really is completed and payment hasn't already been collected.
 */
export async function POST(req: Request) {
  try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, reason: "Server not configured" },
      { status: 503 },
    );
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { ok: false, reason: "Stripe not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.walk_id) {
    return NextResponse.json({ ok: false, reason: "Bad body" }, { status: 400 });
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
  const callerId = userRes.user?.id;
  if (!callerId) {
    return NextResponse.json({ ok: false, reason: "Invalid session" }, { status: 401 });
  }

  // Load the walk
  const { data: walkRow } = await admin
    .from("walks")
    .select(
      "id, owner_id, walker_id, status, price_aed, payment_status, stripe_payment_intent_id",
    )
    .eq("id", body.walk_id)
    .maybeSingle();
  if (!walkRow) {
    return NextResponse.json({ ok: false, reason: "Walk not found" }, { status: 404 });
  }

  // Only the walker on the walk, or the owner, can trigger a charge
  if (callerId !== walkRow.walker_id && callerId !== walkRow.owner_id) {
    return NextResponse.json(
      { ok: false, reason: "Not a party to this walk" },
      { status: 403 },
    );
  }

  if (walkRow.status !== "completed") {
    return NextResponse.json(
      { ok: false, reason: "Walk is not completed" },
      { status: 409 },
    );
  }
  if (walkRow.payment_status === "paid") {
    return NextResponse.json({ ok: true, already: true });
  }

  // Find the owner's Stripe customer + default card
  const { data: owner } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", walkRow.owner_id)
    .maybeSingle();
  if (!owner?.stripe_customer_id) {
    await admin
      .from("walks")
      .update({ payment_status: "failed" })
      .eq("id", walkRow.id);
    return NextResponse.json(
      { ok: false, reason: "Owner has no saved card" },
      { status: 402 },
    );
  }

  const stripe = getStripe();

  // Pick the most recent card on file
  const methods = await stripe.paymentMethods.list({
    customer: owner.stripe_customer_id,
    type: "card",
    limit: 1,
  });
  const paymentMethod = methods.data[0];
  if (!paymentMethod) {
    await admin
      .from("walks")
      .update({ payment_status: "failed" })
      .eq("id", walkRow.id);
    return NextResponse.json(
      { ok: false, reason: "No card on file" },
      { status: 402 },
    );
  }

  const { totalFils, feeAed } = platformFeeFromPrice(walkRow.price_aed);

  // Off-session PaymentIntent, confirmed immediately with the saved card
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: totalFils,
      currency: "aed",
      customer: owner.stripe_customer_id,
      payment_method: paymentMethod.id,
      off_session: true,
      confirm: true,
      description: `WoofWalk · walk ${walkRow.id}`,
      metadata: {
        walk_id: walkRow.id,
        owner_id: walkRow.owner_id,
        walker_id: walkRow.walker_id || "",
        platform_fee_aed: String(feeAed),
      },
    });
  } catch (e: any) {
    // Save a note of the failure for the UI to show
    await admin
      .from("walks")
      .update({
        payment_status: "failed",
        stripe_payment_intent_id: e?.payment_intent?.id || null,
        platform_fee_aed: feeAed,
      })
      .eq("id", walkRow.id);
    return NextResponse.json(
      {
        ok: false,
        reason: e?.message || "Charge failed",
        code: e?.code,
      },
      { status: 402 },
    );
  }

  const paid = intent.status === "succeeded";
  await admin
    .from("walks")
    .update({
      payment_status: paid ? "paid" : "failed",
      stripe_payment_intent_id: intent.id,
      platform_fee_aed: feeAed,
    })
    .eq("id", walkRow.id);

  return NextResponse.json({
    ok: paid,
    payment_intent_id: intent.id,
    status: intent.status,
  });
  } catch (e: any) {
    console.error("charge-walk error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}

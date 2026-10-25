import Stripe from "stripe";

/**
 * Server-side Stripe client. Lazily instantiated so the module can be
 * imported safely in environments where the key isn't set (the client
 * code will return a clear error at call time instead of crashing on
 * import).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it in Vercel → Settings → Environment Variables.",
    );
  }
  _stripe = new Stripe(key, {
    // Pin an API version so Stripe doesn't change behavior under us
    apiVersion: "2024-11-20.acacia" as any,
    typescript: true,
  });
  return _stripe;
}

/**
 * Platform fee (what WoofWalk keeps). Expressed in AED fils (1/100 of
 * an AED) because Stripe amounts are always in the smallest currency unit.
 */
export function platformFeeFromPrice(priceAed: number): {
  totalFils: number;
  feeFils: number;
  walkerFils: number;
  feeAed: number;
  walkerAed: number;
} {
  const totalFils = Math.round(priceAed * 100);
  const feeAed = Math.max(1, Math.round(priceAed * 0.1)); // 10%, min AED 1
  const feeFils = feeAed * 100;
  const walkerFils = totalFils - feeFils;
  return {
    totalFils,
    feeFils,
    walkerFils,
    feeAed,
    walkerAed: priceAed - feeAed,
  };
}

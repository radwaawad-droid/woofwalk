"use client";

import { loadStripe, Stripe } from "@stripe/stripe-js";

let _promise: Promise<Stripe | null> | null = null;

/**
 * Lazily load Stripe.js. Returns null if the publishable key is missing,
 * so callers can show a graceful 'payments not available' message instead
 * of crashing.
 */
export function getStripeClient(): Promise<Stripe | null> {
  if (_promise) return _promise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    _promise = Promise.resolve(null);
    return _promise;
  }
  _promise = loadStripe(key);
  return _promise;
}
